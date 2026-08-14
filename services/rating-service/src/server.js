const express = require("express");
const cors = require("cors");

require("dotenv").config();

const {
    waitForDatabase
} = require("./config/waitForDatabase");

const ratingRoutes =
    require("./routes/ratingRoutes");

const errorHandler =
    require("./middleware/errorHandler");


const app = express();


app.use(cors());

app.use(express.json());


app.get("/", (req, res) => {

    res.json({
        message:
            "Rating Service is running"
    });

});


app.get("/health", (req, res) => {

    res.status(200).json({
        status: "UP",
        service: "rating-service",
        timestamp: new Date().toISOString()
    });

});


app.use(
    "/api/v1/ratings",
    ratingRoutes
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


const PORT = process.env.PORT || 8082;


async function startServer() {

    try {

        await waitForDatabase();

        console.log(
            "Rating MySQL connected successfully"
        );


        app.listen(
            PORT,
            () => {

                console.log(
                    `Rating Service running on port ${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            "Database connection failed:",
            error.message
        );

        process.exit(1);
    }

}


startServer();


module.exports = app;
