const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// ============================================================
// GET BASKET FOR CHECKOUT
// ============================================================

const getBasketForCheckout = async (
    connection,
    customerId
) => {

    const [baskets] = await connection.query(
        `
        SELECT customer_id
        FROM baskets
        WHERE customer_id = ?
        `,
        [customerId]
    );

    if (baskets.length === 0) {
        return null;
    }

    // customer_id acts as basket ID
    const basketId = baskets[0].customer_id;

    const [items] = await connection.query(
        `
        SELECT
            id,
            cake_id AS cakeId,
            cake_name AS cakeName,
            image_url AS imageUrl,
            unit_price AS unitPrice,
            quantity,
            created_at AS addedAt
        FROM basket_items
        WHERE customer_id = ?
        ORDER BY created_at ASC
        `,
        [customerId]
    );

    return {
        basketId,
        items
    };
};


// ============================================================
// CREATE ORDER
// ============================================================

const createOrder = async (
    connection,
    order
) => {

    await connection.query(
        `
        INSERT INTO orders
        (
            id,
            order_number,
            customer_id,
            customer_name,
            customer_email,
            customer_phone,
            delivery_address,
            delivery_notes,
            notification_channels,
            status,
            subtotal,
            delivery_fee,
            tax,
            total,
            currency,
            placed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            order.id,
            order.orderNumber,
            order.customerId,
            order.customerName,
            order.customerEmail,
            order.customerPhone,
            order.deliveryAddress,
            order.deliveryNotes,
            JSON.stringify(order.notificationChannels),
            order.status,
            order.subtotal,
            order.deliveryFee,
            order.tax,
            order.total,
            order.currency,
            order.placedAt
        ]
    );
};


// ============================================================
// CREATE ORDER ITEMS
// ============================================================

const createOrderItems = async (
    connection,
    orderId,
    items
) => {

    for (const item of items) {

        await connection.query(
            `
            INSERT INTO order_items
            (
                id,
                order_id,
                cake_id,
                cake_name,
                image_url,
                unit_price,
                quantity,
                line_total
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                uuidv4(),
                orderId,
                item.cakeId,
                item.cakeName,
                item.imageUrl,
                item.unitPrice,
                item.quantity,
                item.lineTotal
            ]
        );
    }
};


// ============================================================
// CLEAR BASKET
// ============================================================

const clearBasket = async (
    connection,
    basketId
) => {

    // basketId is actually customerId

    await connection.query(
        `
        DELETE FROM basket_items
        WHERE customer_id = ?
        `,
        [basketId]
    );
};


// ============================================================
// CREATE OUTBOX EVENT
// ============================================================

const createOutboxEvent = async (
    connection,
    event
) => {

    await connection.query(
        `
        INSERT INTO outbox_events
        (
            event_id,
            event_type,
            aggregate_id,
            payload,
            status,
            attempts
        )
        VALUES (?, ?, ?, ?, 'PENDING', 0)
        `,
        [
            event.eventId,
            event.eventType,
            event.aggregateId,
            JSON.stringify(event.payload)
        ]
    );
};


// ============================================================
// GET ORDER ITEMS
// ============================================================

const getOrderItems = async (orderId) => {

    const [items] = await pool.query(
        `
        SELECT
            cake_id AS cakeId,
            cake_name AS cakeName,
            image_url AS imageUrl,
            unit_price AS unitPrice,
            quantity,
            line_total AS lineTotal
        FROM order_items
        WHERE order_id = ?
        ORDER BY cake_name ASC
        `,
        [orderId]
    );

    return items;
};


// ============================================================
// GET ORDER BY ID
// ============================================================

const getOrderById = async (
    orderId,
    customerId
) => {

    const [orders] = await pool.query(
        `
        SELECT
            id,
            order_number AS orderNumber,
            customer_id AS customerId,
            customer_name AS customerName,
            customer_email AS customerEmail,
            customer_phone AS customerPhone,
            delivery_address AS deliveryAddress,
            delivery_notes AS deliveryNotes,
            notification_channels AS notificationChannels,
            status,
            subtotal,
            delivery_fee AS deliveryFee,
            tax,
            total,
            currency,
            placed_at AS placedAt,
            updated_at AS updatedAt
        FROM orders
        WHERE id = ?
        AND customer_id = ?
        `,
        [
            orderId,
            customerId
        ]
    );

    if (orders.length === 0) {
        return null;
    }

    const order = orders[0];

    const items = await getOrderItems(orderId);

    return {
        ...order,

        notificationChannels:
            typeof order.notificationChannels === "string"
                ? JSON.parse(order.notificationChannels)
                : order.notificationChannels,

        items
    };
};


// ============================================================
// GET ORDERS BY CUSTOMER
// ============================================================

const getOrdersByCustomer = async (
    customerId,
    page,
    size,
    status
) => {

    const offset = page * size;

    let where = `
        WHERE customer_id = ?
    `;

    const values = [
        customerId
    ];

    if (status) {

        where += `
            AND status = ?
        `;

        values.push(status);
    }

    const [rows] = await pool.query(
        `
        SELECT
            id,
            order_number AS orderNumber,
            customer_id AS customerId,
            customer_name AS customerName,
            customer_email AS customerEmail,
            customer_phone AS customerPhone,
            delivery_address AS deliveryAddress,
            delivery_notes AS deliveryNotes,
            notification_channels AS notificationChannels,
            status,
            subtotal,
            delivery_fee AS deliveryFee,
            tax,
            total,
            currency,
            placed_at AS placedAt,
            updated_at AS updatedAt
        FROM orders
        ${where}
        ORDER BY placed_at DESC
        LIMIT ? OFFSET ?
        `,
        [
            ...values,
            size,
            offset
        ]
    );

    const [countRows] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM orders
        ${where}
        `,
        values
    );

    // ========================================================
    // ADD ITEMS TO EVERY ORDER
    // ========================================================

    for (const order of rows) {

        order.notificationChannels =
            typeof order.notificationChannels === "string"
                ? JSON.parse(order.notificationChannels)
                : order.notificationChannels;

        order.items = await getOrderItems(order.id);
    }

    return {
        rows,

        total:
            Number(
                countRows[0].total
            )
    };
};


// ============================================================
// GET ORDER BY NUMBER
// ============================================================

const getOrderByNumber = async (
    orderNumber,
    customerId
) => {

    const [rows] = await pool.query(
        `
        SELECT
            id,
            order_number AS orderNumber,
            customer_id AS customerId,
            customer_name AS customerName,
            customer_email AS customerEmail,
            customer_phone AS customerPhone,
            delivery_address AS deliveryAddress,
            delivery_notes AS deliveryNotes,
            notification_channels AS notificationChannels,
            status,
            subtotal,
            delivery_fee AS deliveryFee,
            tax,
            total,
            currency,
            placed_at AS placedAt,
            updated_at AS updatedAt
        FROM orders
        WHERE order_number = ?
        AND customer_id = ?
        `,
        [
            orderNumber,
            customerId
        ]
    );

    if (rows.length === 0) {
        return null;
    }

    const order = rows[0];

    const items = await getOrderItems(order.id);

    return {
        ...order,

        notificationChannels:
            typeof order.notificationChannels === "string"
                ? JSON.parse(order.notificationChannels)
                : order.notificationChannels,

        items
    };
};


// ============================================================
// UPDATE ORDER STATUS
// ============================================================

const updateOrderStatus = async (
    orderId,
    customerId,
    status
) => {

    const [result] = await pool.query(
        `
        UPDATE orders
        SET status = ?
        WHERE id = ?
        AND customer_id = ?
        `,
        [
            status,
            orderId,
            customerId
        ]
    );

    return result.affectedRows > 0;
};


// ============================================================
// GET ORDER STATUS
// ============================================================

const getOrderStatus = async (
    orderId,
    customerId
) => {

    const [rows] = await pool.query(
        `
        SELECT status
        FROM orders
        WHERE id = ?
        AND customer_id = ?
        `,
        [
            orderId,
            customerId
        ]
    );

    return rows[0];
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    getBasketForCheckout,

    createOrder,

    createOrderItems,

    clearBasket,

    createOutboxEvent,

    getOrderById,

    getOrdersByCustomer,

    getOrderByNumber,

    updateOrderStatus,

    getOrderStatus

};