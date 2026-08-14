const express = require("express");
const cors = require("cors");

require("dotenv").config();

const {
    waitForDatabase
} = require("./config/waitForDatabase");

const basketRoutes =
    require("./routes/basketRoutes");

const orderRoutes =
    require("./routes/orderRoutes");

const errorHandler =
    require("./middleware/errorHandler");

const {
    startOutboxPublisher
} = require("./messaging/outboxPublisher");

const {
    setupRabbitTopology
} = require("./messaging/rabbitTopology");


const app = express();


app.use(cors());

app.use(express.json());


app.get("/", (req, res) => {

    res.json({
        message:
            "Order Service is running"
    });
});


app.get("/health", (req, res) => {

    res.status(200).json({
        status: "UP",
        service: "order-service",
        timestamp: new Date().toISOString()
    });
});


app.use(
    "/api/v1/basket",
    basketRoutes
);

app.use(
    "/api/v1/orders",
    orderRoutes
);


// Unknown routes must return the same JSON error shape as everything else.
app.use((req, res) => {

    res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        error: "NOT_FOUND",
        message: `Route ${req.method} ${req.originalUrl} does not exist`,
        path: req.originalUrl,
        correlationId:
            req.headers["x-correlation-id"] || null
    });
});


app.use(errorHandler);


const PORT = process.env.PORT || 8083;


async function startServer() {

    try {

        await waitForDatabase();

        console.log(
            "Order MySQL connected successfully"
        );


        /*
         * The order service owns the order.events exchange.
         * Queue ownership stays with each consuming service.
         *
         * A broker that is still starting must not stop checkout from
         * working: the outbox publisher retries on its own schedule.
         */

        try {

            await setupRabbitTopology();

        } catch (error) {

            console.error(
                "RabbitMQ topology setup deferred:",
                error.message
            );
        }


        startOutboxPublisher();


        app.listen(
            PORT,
            () => {

                console.log(
                    `Order Service running on port ${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            "Service startup failed:",
            error.message
        );

        process.exit(1);
    }
}

startServer();


module.exports = app;
