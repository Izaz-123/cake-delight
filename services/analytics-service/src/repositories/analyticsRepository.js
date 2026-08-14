const pool = require("../config/db");

const {
    v4: uuidv4
} = require("uuid");


const findByEventId = async (
    eventId
) => {

    const [rows] = await pool.query(
        `
        SELECT
            id,
            event_id AS eventId,
            order_id AS orderId
        FROM order_analytics
        WHERE event_id = ?
        `,
        [eventId]
    );

    return rows[0];
};


const createOrderAnalytics = async (
    connection,
    order
) => {

    await connection.query(
        `
        INSERT INTO order_analytics
        (
            id,
            event_id,
            order_id,
            order_number,
            customer_id,
            status,
            subtotal,
            delivery_fee,
            tax,
            total,
            currency,
            item_count,
            placed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            uuidv4(),

            order.eventId,

            order.orderId,

            order.orderNumber,

            order.customerId,

            order.status,

            order.totals.subtotal,

            order.totals.deliveryFee,

            order.totals.tax,

            order.totals.total,

            order.totals.currency,

            order.totals.itemCount,

            new Date(order.placedAt)
        ]
    );
};


const createItemAnalytics = async (
    connection,
    orderId,
    item
) => {

    await connection.query(
        `
        INSERT INTO order_item_analytics
        (
            id,
            order_id,
            cake_id,
            cake_name,
            quantity,
            unit_price,
            line_total
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            uuidv4(),

            orderId,

            item.cakeId,

            item.cakeName,

            item.quantity,

            item.unitPrice,

            item.lineTotal
        ]
    );
};


const getSummary = async () => {

    const [
        rows
    ] = await pool.query(
        `
        SELECT

            COUNT(*) AS totalOrders,

            COALESCE(
                SUM(total),
                0
            ) AS totalRevenue,

            COALESCE(
                SUM(item_count),
                0
            ) AS totalItems

        FROM order_analytics
        WHERE status != 'CANCELLED'
        `
    );

    return rows[0];
};


const getTopCakes = async (
    limit
) => {

    const [
        rows
    ] = await pool.query(
        `
        SELECT

            cake_id AS cakeId,

            cake_name AS cakeName,

            SUM(quantity) AS quantitySold,

            SUM(line_total) AS revenue

        FROM order_item_analytics oi

        INNER JOIN order_analytics oa
            ON oa.order_id = oi.order_id

        WHERE oa.status != 'CANCELLED'

        GROUP BY
            cake_id,
            cake_name

        ORDER BY
            quantitySold DESC

        LIMIT ?
        `,
        [limit]
    );

    return rows;
};


const getDailyRevenue = async () => {

    const [
        rows
    ] = await pool.query(
        `
        SELECT

            DATE(placed_at) AS date,

            COUNT(*) AS orders,

            SUM(total) AS revenue

        FROM order_analytics

        WHERE status != 'CANCELLED'

        GROUP BY
            DATE(placed_at)

        ORDER BY
            date DESC
        `
    );

    return rows;
};


module.exports = {
    findByEventId,
    createOrderAnalytics,
    createItemAnalytics,
    getSummary,
    getTopCakes,
    getDailyRevenue
};