/*
 * Single error shape for every service so the gateway, the browser and the
 * logs all see the same contract.
 */

const STATUS_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "UNPROCESSABLE_ENTITY",
    500: "INTERNAL_SERVER_ERROR",
    502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE",
    504: "GATEWAY_TIMEOUT"
};


/*
 * A downstream service that is restarting or unreachable is a gateway
 * problem, not an internal fault: report it as 503 so the client can retry.
 */

const UPSTREAM_ERRORS = [
    "ECONNREFUSED",
    "ECONNRESET",
    "ENOTFOUND",
    "EAI_AGAIN",
    "ETIMEDOUT",
    "ECONNABORTED"
];


const errorHandler = (err, req, res, next) => {

    const status =
        err.status ||
        (UPSTREAM_ERRORS.includes(err.code) ? 503 : 500);

    const correlationId =
        req.headers["x-correlation-id"] || null;


    /*
     * Server faults get a stack trace; client mistakes get one line.
     */

    if (status >= 500) {

        console.error(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level: "error",
                correlationId,
                path: req.originalUrl,
                message: err.message
            })
        );

        console.error(err.stack);

    } else {

        console.warn(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level: "warn",
                correlationId,
                status,
                path: req.originalUrl,
                message: err.message
            })
        );
    }


    if (res.headersSent) {
        return next(err);
    }


    return res.status(status).json({
        timestamp: new Date().toISOString(),
        status,
        error:
            STATUS_CODES[status] ||
            "INTERNAL_SERVER_ERROR",
        message:
            status === 503
                ? "The requested service is currently unavailable"
                : status >= 500
                    ? "Something went wrong"
                    : err.message,
        path: req.originalUrl,
        correlationId
    });
};

module.exports = errorHandler;
