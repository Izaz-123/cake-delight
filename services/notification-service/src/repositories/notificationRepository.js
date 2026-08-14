const pool = require("../config/db");

const {
    v4: uuidv4
} = require("uuid");


const findNotification = async (
    eventId,
    channel
) => {

    const [rows] = await pool.query(
        `
        SELECT
            id,
            event_id AS eventId,
            channel,
            status
        FROM notifications
        WHERE event_id = ?
        AND channel = ?
        `,
        [
            eventId,
            channel
        ]
    );

    return rows[0];
};


const createNotification = async (
    notification
) => {

    const id = uuidv4();

    await pool.query(
        `
        INSERT INTO notifications
        (
            id,
            event_id,
            order_id,
            customer_id,
            channel,
            recipient,
            subject,
            message,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            notification.eventId,
            notification.orderId,
            notification.customerId,
            notification.channel,
            notification.recipient,
            notification.subject,
            notification.message,
            notification.status
        ]
    );

    return id;
};


const markSent = async (
    notificationId
) => {

    await pool.query(
        `
        UPDATE notifications
        SET
            status = 'SENT',
            sent_at = NOW()
        WHERE id = ?
        `,
        [notificationId]
    );
};


const markFailed = async (
    notificationId,
    errorMessage
) => {

    await pool.query(
        `
        UPDATE notifications
        SET
            status = 'FAILED',
            error_message = ?
        WHERE id = ?
        `,
        [
            errorMessage,
            notificationId
        ]
    );
};


const getNotifications = async (
    customerId
) => {

    const [rows] = await pool.query(
        `
        SELECT
            id,
            event_id AS eventId,
            order_id AS orderId,
            customer_id AS customerId,
            channel,
            recipient,
            subject,
            message,
            status,
            error_message AS errorMessage,
            created_at AS createdAt,
            sent_at AS sentAt
        FROM notifications
        WHERE customer_id = ?
        ORDER BY created_at DESC
        `,
        [customerId]
    );

    return rows;
};


module.exports = {
    findNotification,
    createNotification,
    markSent,
    markFailed,
    getNotifications
};