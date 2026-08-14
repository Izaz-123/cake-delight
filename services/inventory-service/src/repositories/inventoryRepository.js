const pool = require("../config/db");

const {
    v4: uuidv4
} = require("uuid");


const getInventory = async (cakeId) => {

    const [rows] = await pool.query(
        `
        SELECT
            cake_id AS cakeId,
            cake_name AS cakeName,
            stock_quantity AS stockQuantity,
            reserved_quantity AS reservedQuantity,
            (
                stock_quantity -
                reserved_quantity
            ) AS availableQuantity,
            updated_at AS updatedAt
        FROM inventory
        WHERE cake_id = ?
        `,
        [cakeId]
    );

    return rows[0];
};


const getInventoryForUpdate = async (
    connection,
    cakeId
) => {

    const [rows] =
        await connection.query(
            `
            SELECT
                cake_id AS cakeId,
                cake_name AS cakeName,
                stock_quantity AS stockQuantity,
                reserved_quantity AS reservedQuantity
            FROM inventory
            WHERE cake_id = ?
            FOR UPDATE
            `,
            [cakeId]
        );

    return rows[0];
};


const getReservationByEventId = async (
    eventId
) => {

    const [rows] = await pool.query(
        `
        SELECT
            id,
            event_id AS eventId,
            order_id AS orderId,
            order_number AS orderNumber,
            status,
            created_at AS createdAt
        FROM stock_reservations
        WHERE event_id = ?
        `,
        [eventId]
    );

    return rows[0];
};


const createReservation = async (
    connection,
    reservation
) => {

    await connection.query(
        `
        INSERT INTO stock_reservations
        (
            id,
            event_id,
            order_id,
            order_number,
            status
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            reservation.id,
            reservation.eventId,
            reservation.orderId,
            reservation.orderNumber,
            reservation.status
        ]
    );
};


const createReservationItem = async (
    connection,
    reservationId,
    cakeId,
    quantity
) => {

    await connection.query(
        `
        INSERT INTO stock_reservation_items
        (
            id,
            reservation_id,
            cake_id,
            quantity
        )
        VALUES (?, ?, ?, ?)
        `,
        [
            uuidv4(),
            reservationId,
            cakeId,
            quantity
        ]
    );
};


/*
 * Provision a stock row for a cake the Inventory Service has not seen
 * before. Used when a cake is added to the catalogue after the inventory
 * database was seeded.
 */

const createInventory = async (
    connection,
    cakeId,
    cakeName,
    stockQuantity
) => {

    await connection.query(
        `
        INSERT INTO inventory
        (
            cake_id,
            cake_name,
            stock_quantity,
            reserved_quantity
        )
        VALUES (?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
            cake_name = VALUES(cake_name)
        `,
        [
            cakeId,
            cakeName,
            stockQuantity
        ]
    );
};


const reserveStock = async (
    connection,
    cakeId,
    quantity
) => {

    await connection.query(
        `
        UPDATE inventory
        SET reserved_quantity =
            reserved_quantity + ?
        WHERE cake_id = ?
        `,
        [
            quantity,
            cakeId
        ]
    );
};


const getReservationItems = async (
    reservationId
) => {

    const [rows] = await pool.query(
        `
        SELECT
            cake_id AS cakeId,
            quantity
        FROM stock_reservation_items
        WHERE reservation_id = ?
        `,
        [reservationId]
    );

    return rows;
};


module.exports = {
    getInventory,
    getInventoryForUpdate,
    getReservationByEventId,
    createReservation,
    createReservationItem,
    createInventory,
    reserveStock,
    getReservationItems
};