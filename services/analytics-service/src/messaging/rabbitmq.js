const amqp = require("amqplib");

let connection = null;
let channel = null;

const closeListeners = [];


const EXCHANGE =
    process.env.RABBITMQ_EXCHANGE ||
    "order.events";


const connectRabbitMQ = async () => {

    if (channel) {
        return channel;
    }


    connection =
        await amqp.connect(
            process.env.RABBITMQ_URL ||
            "amqp://guest:guest@localhost:5672"
        );


    channel =
        await connection.createChannel();


    await channel.assertExchange(
        EXCHANGE,
        "topic",
        {
            durable: true
        }
    );


    connection.on(
        "error",
        error => {

            console.error(
                "RabbitMQ error:",
                error.message
            );
        }
    );


    connection.on(
        "close",
        () => {

            console.log(
                "RabbitMQ connection closed"
            );

            connection = null;
            channel = null;

            closeListeners.forEach(
                listener => {

                    try {
                        listener();
                    } catch (error) {
                        console.error(
                            "RabbitMQ close listener failed:",
                            error.message
                        );
                    }
                }
            );
        }
    );


    console.log(
        "Analytics RabbitMQ connected"
    );


    return channel;
};


const getChannel = () => {

    if (!channel) {

        throw new Error(
            "RabbitMQ channel not connected"
        );
    }

    return channel;
};


/*
 * Registered once at startup so the consumer can reattach after the broker
 * restarts or the connection drops.
 */

const onConnectionClosed = (listener) => {

    closeListeners.push(listener);
};


module.exports = {
    connectRabbitMQ,
    getChannel,
    onConnectionClosed
};
