const express = require("express");
const cors = require("cors");
const path = require("path");
const { randomUUID } = require("crypto");

require("dotenv").config();

const proxyRoutes = require("./routes/proxyRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());

app.use(express.json());


// ===============================
// CORRELATION ID + REQUEST LOG
// ===============================
//
// Every request entering the system is tagged once at the gateway and the
// header travels with the proxied call, so a single request can be followed
// across service logs and into the order.completed event.

app.use((req, res, next) => {

    const correlationId =
        req.headers["x-correlation-id"] ||
        randomUUID();

    req.headers["x-correlation-id"] = correlationId;

    res.setHeader("X-Correlation-Id", correlationId);

    const startedAt = Date.now();

    res.on("finish", () => {

        console.log(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                correlationId,
                method: req.method,
                path: req.originalUrl,
                status: res.statusCode,
                durationMs: Date.now() - startedAt
            })
        );

    });

    next();
});


// ===============================
// FRONTEND
// ===============================

// `extensions: ["html"]` makes /index, /cakes, /basket resolve to their
// .html files, so the pages work with or without the extension.
app.use(
    express.static(
        path.join(__dirname, "../../frontend"),
        {
            extensions: ["html"]
        }
    )
);


// ===============================
// HEALTH
// ===============================

app.get("/health", (req, res) => {

    res.status(200).json({
        status: "UP",
        service: "API Gateway",
        timestamp: new Date().toISOString()
    });

});


// ===============================
// DOWNSTREAM HEALTH
// ===============================

app.get("/health/services", async (req, res) => {

    const services = {
        catalog: process.env.CATALOG_SERVICE_URL,
        rating: process.env.RATING_SERVICE_URL,
        order: process.env.ORDER_SERVICE_URL,
        inventory: process.env.INVENTORY_SERVICE_URL,
        notification: process.env.NOTIFICATION_SERVICE_URL,
        analytics: process.env.ANALYTICS_SERVICE_URL
    };

    const checks = await Promise.all(
        Object.entries(services).map(
            async ([name, url]) => {

                if (!url) {
                    return [name, "NOT_CONFIGURED"];
                }

                try {

                    const response = await fetch(
                        `${url}/health`,
                        {
                            signal: AbortSignal.timeout(2000)
                        }
                    );

                    return [
                        name,
                        response.ok ? "UP" : "DOWN"
                    ];

                } catch (error) {
                    return [name, "DOWN"];
                }
            }
        )
    );

    const results =
        Object.fromEntries(checks);

    const allUp =
        Object.values(results).every(
            status => status === "UP"
        );

    res.status(allUp ? 200 : 503).json({
        status: allUp ? "UP" : "DEGRADED",
        services: results,
        timestamp: new Date().toISOString()
    });

});


// ===============================
// SWAGGER API DOCUMENTATION
// ===============================

app.get("/api-docs", (req, res) => {

    res.send(`
<!DOCTYPE html>

<html>

<head>

    <title>Cake Delight API Documentation</title>

    <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
    >

</head>

<body>

<div id="swagger-ui"></div>

<script
    src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js">
</script>

<script>

window.onload = () => {

    SwaggerUIBundle({

        url: "/api-docs/openapi.yaml",

        dom_id: "#swagger-ui"

    });

};

</script>

</body>

</html>
    `);

});


app.get("/api-docs/openapi.yaml", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../../docs/openapi.yaml"
        )
    );

});


// ===============================
// API ROUTES
// ===============================

app.use(
    "/api/v1",
    proxyRoutes
);


// ===============================
// NOT FOUND
// ===============================
//
// API calls get the shared JSON error shape; anything else is a browser
// asking for a page that does not exist.

app.use((req, res) => {

    const correlationId =
        req.headers["x-correlation-id"] || null;


    if (req.originalUrl.startsWith("/api/")) {

        return res.status(404).json({
            timestamp: new Date().toISOString(),
            status: 404,
            error: "NOT_FOUND",
            message: `Route ${req.method} ${req.originalUrl} does not exist`,
            path: req.originalUrl,
            correlationId
        });
    }


    res.status(404).sendFile(
        path.join(
            __dirname,
            "../../frontend/404.html"
        )
    );

});


// ===============================
// ERROR HANDLER
// ===============================

app.use(errorHandler);


const PORT =
    process.env.PORT || 8080;


app.listen(
    PORT,
    () => {

        console.log(
            `API Gateway running on port ${PORT}`
        );

    }
);


module.exports = app;