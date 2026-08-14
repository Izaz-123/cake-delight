const express = require("express");
const cors = require("cors");

require("dotenv").config();

const {
    waitForDatabase
} = require("./config/waitForDatabase");

const inventoryRoutes =
    require("./routes/inventoryRoutes");

const errorHandler =
    require("./middleware/errorHandler");

const {
    startOrderConsumer
} = require("./messaging/orderConsumer");


const app = express();


app.use(cors());

app.use(express.json());


app.get("/", (req, res) => {

    res.json({
        message:
            "Inventory Service is running"
    });
});


app.get("/health", (req, res) => {

    res.status(200).json({
        status: "UP",
        service: "inventory-service",
        timestamp: new Date().toISOString()
    });
});


app.use(
    "/api/v1/inventory",
    inventoryRoutes
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


const PORT = process.env.PORT || 8084;


/*
 * RabbitMQ may still be starting when this pod comes up, and the broker
 * connection can drop later on. Keep retrying in the background so the
 * REST API stays available and the consumer reattaches on its own.
 */

const startConsumerWithRetry = async (
    delayMs = 5000
) => {

    try {

        await startOrderConsumer();

    } catch (error) {

        console.error(
            "RabbitMQ consumer not started:",
            error.message
        );

        setTimeout(
            () => startConsumerWithRetry(delayMs),
            delayMs
        );
    }
};


async function startServer() {

    try {

        await waitForDatabase();

        console.log(
            "Inventory MySQL connected"
        );


        startConsumerWithRetry();


        app.listen(
            PORT,
            () => {

                console.log(
                    `Inventory Service running on port ${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            "Inventory startup failed:",
            error.message
        );

        process.exit(1);
    }
}


startServer();


module.exports = app;
