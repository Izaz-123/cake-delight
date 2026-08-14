const pool =
    require("../config/db");

const analyticsRepository =
    require("../repositories/analyticsRepository");


const processOrderCompleted = async (
    event
) => {

    /*
     * Idempotency check
     */

    const existing =
        await analyticsRepository.findByEventId(
            event.eventId
        );


    if (existing) {

        console.log(
            `Analytics event already processed: ${event.eventId}`
        );

        return {
            duplicate: true,

            orderId:
                existing.orderId
        };
    }


    const connection =
        await pool.getConnection();


    try {

        await connection.beginTransaction();


        /*
         * Create order analytics
         */

        await analyticsRepository
            .createOrderAnalytics(
                connection,
                {
                    eventId:
                        event.eventId,

                    orderId:
                        event.order.orderId,

                    orderNumber:
                        event.order.orderNumber,

                    customerId:
                        event.order.customer.customerId,

                    status:
                        event.order.status,

                    totals:
                        event.order.totals,

                    placedAt:
                        event.order.placedAt
                }
            );


        /*
         * Create item analytics
         */

        for (
            const item
            of event.order.items
        ) {

            await analyticsRepository
                .createItemAnalytics(
                    connection,

                    event.order.orderId,

                    item
                );
        }


        await connection.commit();


        return {
            duplicate: false,

            orderId:
                event.order.orderId
        };


    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {

        connection.release();
    }
};


const getSummary = async () => {

    const summary =
        await analyticsRepository
            .getSummary();


    return {
        totalOrders:
            Number(
                summary.totalOrders
            ),

        totalRevenue:
            Number(
                summary.totalRevenue
            ),

        totalItems:
            Number(
                summary.totalItems
            )
    };
};


/*
 * MySQL returns SUM() over DECIMAL columns as a string. Convert here so the
 * API contract stays numeric.
 */

const getTopCakes = async (
    limit
) => {

    const rows =
        await analyticsRepository
            .getTopCakes(limit);


    return rows.map(row => ({
        cakeId: row.cakeId,
        cakeName: row.cakeName,
        quantitySold: Number(row.quantitySold),
        revenue: Number(row.revenue)
    }));
};


const getDailyRevenue = async () => {

    const rows =
        await analyticsRepository
            .getDailyRevenue();


    return rows.map(row => ({
        date:
            row.date instanceof Date
                ? row.date.toISOString().slice(0, 10)
                : row.date,
        orders: Number(row.orders),
        revenue: Number(row.revenue)
    }));
};


module.exports = {
    processOrderCompleted,
    getSummary,
    getTopCakes,
    getDailyRevenue
};