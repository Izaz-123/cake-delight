const {
    connectRabbitMQ,
    getChannel,
    onConnectionClosed
} = require("./rabbitmq");

const inventoryService =
    require("../services/inventoryService");


const EXCHANGE =
    process.env.RABBITMQ_EXCHANGE ||
    "order.events";

const QUEUE =
    process.env.RABBITMQ_QUEUE ||
    "inventory.order.completed";

const DLX =
    process.env.RABBITMQ_DLX ||
    "order.dlx";

const DLQ =
    process.env.RABBITMQ_DLQ ||
    "inventory.order.completed.dlq";

const ROUTING_KEY =
    process.env.RABBITMQ_ROUTING_KEY ||
    "order.completed";


const MAX_ATTEMPTS = 3;

const RETRY_DELAY_MS = 1000;

const RECONNECT_DELAY_MS = 5000;


let consuming = false;


const delay = (ms) =>
    new Promise(
        resolve => setTimeout(resolve, ms)
    );


/*
 * Transient failures (a database blip, a broker hiccup) should not send a
 * valid order event to the dead letter queue on the first try, so the
 * handler is retried a bounded number of times before the message is
 * rejected for good.
 */

const handleWithRetry = async (event) => {

    let lastError;

    for (
        let attempt = 1;
        attempt <= MAX_ATTEMPTS;
        attempt++
    ) {

        try {

            return await inventoryService
                .reserveFromOrderEvent(event);

        } catch (error) {

            lastError = error;

            console.error(
                `Inventory attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error.message}`
            );

            if (attempt < MAX_ATTEMPTS) {
                await delay(RETRY_DELAY_MS * attempt);
            }
        }
    }

    throw lastError;
};


const startOrderConsumer = async () => {

    await connectRabbitMQ();

    const channel =
        getChannel();


    /*
     * Main exchange (also owned by the Order Service publisher).
     */

    await channel.assertExchange(
        EXCHANGE,
        "topic",
        {
            durable: true
        }
    );


    /*
     * Dead letter exchange and queue.
     */

    await channel.assertExchange(
        DLX,
        "topic",
        {
            durable: true
        }
    );


    await channel.assertQueue(
        DLQ,
        {
            durable: true
        }
    );


    await channel.bindQueue(
        DLQ,
        DLX,
        DLQ
    );


    /*
     * Main queue. Rejected messages are routed to the dead letter exchange
     * using the dead letter queue name as the routing key.
     */

    await channel.assertQueue(
        QUEUE,
        {
            durable: true,

            arguments: {

                "x-dead-letter-exchange":
                    DLX,

                "x-dead-letter-routing-key":
                    DLQ
            }
        }
    );


    await channel.bindQueue(
        QUEUE,
        EXCHANGE,
        ROUTING_KEY
    );


    /*
     * One message at a time.
     */

    await channel.prefetch(1);


    console.log(
        `Inventory consumer listening on ${QUEUE}`
    );


    await channel.consume(
        QUEUE,
        async message => {

            if (!message) {
                return;
            }


            try {

                const event =
                    JSON.parse(
                        message.content.toString()
                    );


                console.log(
                    `Inventory received event ${event.eventId} (${event.eventType})`
                );


                if (
                    event.eventType !==
                    "order.completed"
                ) {

                    throw new Error(
                        `Unsupported event type: ${event.eventType}`
                    );
                }


                if (!event.eventId) {

                    throw new Error(
                        "eventId is required"
                    );
                }


                if (!event.order) {

                    throw new Error(
                        "order is required"
                    );
                }


                const result =
                    await handleWithRetry(event);


                console.log(
                    "Inventory result:",
                    result
                );


                channel.ack(message);


            } catch (error) {

                console.error(
                    "Inventory processing failed:",
                    error.message
                );


                /*
                 * Reject without requeue so RabbitMQ dead letters the
                 * message instead of looping it back to this consumer.
                 */

                channel.nack(
                    message,
                    false,
                    false
                );


                console.log(
                    `Message dead lettered to ${DLQ}`
                );
            }
        }
    );


    consuming = true;
};


/*
 * Reattach after the broker connection drops.
 */

onConnectionClosed(() => {

    if (!consuming) {
        return;
    }

    consuming = false;

    const reconnect = async () => {

        try {

            await startOrderConsumer();

        } catch (error) {

            console.error(
                "Inventory consumer reconnect failed:",
                error.message
            );

            setTimeout(
                reconnect,
                RECONNECT_DELAY_MS
            );
        }
    };

    setTimeout(
        reconnect,
        RECONNECT_DELAY_MS
    );
});


module.exports = {
    startOrderConsumer
};
