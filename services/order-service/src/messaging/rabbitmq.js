const amqp = require("amqplib");

let connection = null;
let channel = null;


const EXCHANGE =
    process.env.RABBITMQ_EXCHANGE ||
    "order.events";


const connectRabbitMQ = async () => {

    if (connection && channel) {
        return channel;
    }


    connection =
        await amqp.connect(
            process.env.RABBITMQ_URL ||
            "amqp://guest:guest@localhost:5672"
        );


    /*
     * A confirm channel lets the outbox publisher wait for the broker to
     * acknowledge each event before the row is marked as PUBLISHED, so an
     * event can never be lost between the database and RabbitMQ.
     */

    channel =
        await connection.createConfirmChannel();


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
                "RabbitMQ connection error:",
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
        }
    );


    console.log(
        "RabbitMQ connected successfully"
    );


    return channel;
};


const getChannel = () => {

    if (!channel) {
        throw new Error(
            "RabbitMQ channel is not connected"
        );
    }

    return channel;
};


module.exports = {
    connectRabbitMQ,
    getChannel
};
