const pool =
    require("../config/db");

const {
    connectRabbitMQ,
    getChannel
} = require("./rabbitmq");

const {
    setupRabbitTopology
} = require("./rabbitTopology");


const EXCHANGE =
    process.env.RABBITMQ_EXCHANGE ||
    "order.events";


const ROUTING_KEY =
    process.env.RABBITMQ_ROUTING_KEY ||
    "order.completed";


const POLL_INTERVAL_MS =
    Number(
        process.env.OUTBOX_POLL_INTERVAL_MS || 5000
    );


const MAX_ATTEMPTS =
    Number(
        process.env.OUTBOX_MAX_ATTEMPTS || 10
    );


let running = false;


/*
 * Publish on a confirm channel and resolve only once RabbitMQ has
 * acknowledged the message.
 */

const publishConfirmed = (
    channel,
    payload,
    event
) =>
    new Promise((resolve, reject) => {

        const message =
            Buffer.from(
                JSON.stringify(payload)
            );


        const accepted = channel.publish(
            EXCHANGE,
            ROUTING_KEY,
            message,
            {
                persistent: true,

                contentType:
                    "application/json",

                messageId:
                    event.eventId,

                type:
                    event.eventType,

                headers: {
                    eventVersion: 1
                }
            },
            error => {

                if (error) {
                    return reject(error);
                }

                resolve();
            }
        );


        if (!accepted) {

            channel.once(
                "drain",
                () => {
                    // Buffer flushed; the confirm callback still applies.
                }
            );
        }
    });


const publishPendingEvents = async () => {

    let channel;

    try {

        await connectRabbitMQ();

        await setupRabbitTopology();

        channel = getChannel();

    } catch (error) {

        console.error(
            "RabbitMQ unavailable:",
            error.message
        );

        return;
    }


    const connection =
        await pool.getConnection();


    try {

        const [
            events
        ] = await connection.query(
            `
            SELECT
                id,
                event_id AS eventId,
                event_type AS eventType,
                aggregate_id AS aggregateId,
                payload,
                attempts
            FROM outbox_events
            WHERE status = 'PENDING'
              AND attempts < ?
            ORDER BY created_at ASC
            LIMIT 20
            `,
            [MAX_ATTEMPTS]
        );


        for (const event of events) {

            try {

                const payload =
                    typeof event.payload === "string"
                        ? JSON.parse(event.payload)
                        : event.payload;


                await publishConfirmed(
                    channel,
                    payload,
                    event
                );


                await connection.query(
                    `
                    UPDATE outbox_events
                    SET
                        status = 'PUBLISHED',
                        attempts = attempts + 1,
                        published_at = NOW()
                    WHERE id = ?
                    `,
                    [event.id]
                );


                console.log(
                    `Published event ${event.eventId}`
                );


            } catch (error) {

                console.error(
                    `Failed to publish event ${event.eventId}:`,
                    error.message
                );


                /*
                 * Give up after MAX_ATTEMPTS so a permanently broken event
                 * cannot block the queue. It stays in the table as FAILED
                 * for inspection.
                 */

                const nextAttempts =
                    Number(event.attempts) + 1;


                await connection.query(
                    `
                    UPDATE outbox_events
                    SET
                        attempts = ?,
                        status = ?,
                        last_error = ?
                    WHERE id = ?
                    `,
                    [
                        nextAttempts,

                        nextAttempts >= MAX_ATTEMPTS
                            ? "FAILED"
                            : "PENDING",

                        error.message,

                        event.id
                    ]
                );
            }
        }


    } finally {

        connection.release();
    }
};


const runOnce = async () => {

    if (running) {
        return;
    }

    running = true;

    try {

        await publishPendingEvents();

    } catch (error) {

        console.error(
            "Outbox publisher cycle failed:",
            error.message
        );

    } finally {

        running = false;
    }
};


const startOutboxPublisher = () => {

    runOnce();

    setInterval(
        runOnce,
        POLL_INTERVAL_MS
    );

    console.log(
        `Outbox publisher started (every ${POLL_INTERVAL_MS}ms)`
    );
};


module.exports = {
    publishPendingEvents,
    startOutboxPublisher
};
