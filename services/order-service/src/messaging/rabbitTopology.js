const {
    connectRabbitMQ,
    getChannel
} = require("./rabbitmq");


const EXCHANGE =
    process.env.RABBITMQ_EXCHANGE ||
    "order.events";

const DLX =
    process.env.RABBITMQ_DLX ||
    "order.dlx";


/*
 * The Order Service publishes order events, so it owns the exchanges only.
 *
 * Every consuming service declares and binds its OWN queue and dead letter
 * queue. Declaring another service's queue here would fix its dead letter
 * arguments in this file too, and any mismatch between the two declarations
 * makes RabbitMQ close the channel with PRECONDITION_FAILED.
 */

const setupRabbitTopology = async () => {

    await connectRabbitMQ();

    const channel =
        getChannel();


    await channel.assertExchange(
        EXCHANGE,
        "topic",
        {
            durable: true
        }
    );


    await channel.assertExchange(
        DLX,
        "topic",
        {
            durable: true
        }
    );


    console.log(
        `RabbitMQ exchanges ready: ${EXCHANGE}, ${DLX}`
    );
};


module.exports = {
    setupRabbitTopology
};
