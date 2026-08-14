const pool =
    require("../config/db");

const inventoryRepository =
    require("../repositories/inventoryRepository");

const catalogClient =
    require("../clients/catalogClient");

const {
    v4: uuidv4
} = require("uuid");


const reserveFromOrderEvent = async (
    event
) => {

    const connection =
        await pool.getConnection();


    try {

        /*
         * Start transaction
         */

        await connection.beginTransaction();


        /*
         * Check idempotency
         */

        const [existing] =
            await connection.query(
                `
                SELECT
                    id,
                    status
                FROM stock_reservations
                WHERE event_id = ?
                FOR UPDATE
                `,
                [event.eventId]
            );


        if (existing.length > 0) {

            await connection.commit();

            return {
                duplicate: true,

                reservationId:
                    existing[0].id,

                status:
                    existing[0].status
            };
        }


        /*
         * Create reservation
         */

        const reservationId =
            uuidv4();


        await inventoryRepository.createReservation(
            connection,
            {
                id:
                    reservationId,

                eventId:
                    event.eventId,

                orderId:
                    event.order.orderId,

                orderNumber:
                    event.order.orderNumber,

                status:
                    "RESERVED"
            }
        );


        /*
         * Process every order item
         */

        for (
            const item
            of event.order.items
        ) {

            let inventory =
                await inventoryRepository
                    .getInventoryForUpdate(
                        connection,
                        item.cakeId
                    );


            /*
             * A cake added to the catalogue after this database was
             * seeded has no stock row yet. Provision it from the
             * catalogue instead of dead lettering a valid order.
             */

            if (!inventory) {

                const cake =
                    await catalogClient.getCake(
                        item.cakeId
                    );


                const openingStock =
                    cake &&
                    cake.stockQuantity !== undefined &&
                    cake.stockQuantity !== null
                        ? Number(cake.stockQuantity)
                        : item.quantity;


                await inventoryRepository.createInventory(
                    connection,
                    item.cakeId,
                    (cake && cake.name) || item.cakeName,
                    openingStock
                );


                console.log(
                    `Provisioned inventory for cake ${item.cakeId} with stock ${openingStock}`
                );


                inventory =
                    await inventoryRepository
                        .getInventoryForUpdate(
                            connection,
                            item.cakeId
                        );
            }


            const available =
                inventory.stockQuantity -
                inventory.reservedQuantity;


            if (
                available <
                item.quantity
            ) {

                throw new Error(
                    `Insufficient stock for ${item.cakeName}`
                );
            }


            await inventoryRepository.reserveStock(
                connection,
                item.cakeId,
                item.quantity
            );


            await inventoryRepository
                .createReservationItem(
                    connection,
                    reservationId,
                    item.cakeId,
                    item.quantity
                );
        }


        /*
         * Everything succeeded
         */

        await connection.commit();


        return {
            duplicate: false,

            reservationId,

            status:
                "RESERVED"
        };


    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {

        connection.release();
    }
};


const getInventory = async (
    cakeId
) => {

    return await inventoryRepository
        .getInventory(cakeId);
};


module.exports = {
    reserveFromOrderEvent,
    getInventory
};