const express = require("express");

const {
    createProxyMiddleware,
    fixRequestBody
} = require("http-proxy-middleware");

const router = express.Router();


// ============================================================
// CATALOG SERVICE
// ============================================================

router.use(
    "/cakes",
    createProxyMiddleware({
        target: process.env.CATALOG_SERVICE_URL,
        changeOrigin: true,

        pathRewrite: (path) => {
            return "/api/v1/cakes" +
                (path === "/" ? "" : path);
        },

        // express.json() has already consumed the request stream, so the
        // parsed body has to be written back onto the proxied request.
        on: {
            proxyReq: fixRequestBody
        }
    })
);


// ============================================================
// RATING SERVICE
// ============================================================

router.use(
    "/ratings",
    createProxyMiddleware({
        target: process.env.RATING_SERVICE_URL,
        changeOrigin: true,

        pathRewrite: (path) => {
            return "/api/v1/ratings" +
                (path === "/" ? "" : path);
        },

        on: {
            proxyReq: fixRequestBody
        }
    })
);


// ============================================================
// BASKET
// ============================================================

router.use(
    "/basket",
    createProxyMiddleware({
        target: process.env.ORDER_SERVICE_URL,
        changeOrigin: true,

        pathRewrite: (path) => {
            return "/api/v1/basket" +
                (path === "/" ? "" : path);
        },

        on: {
            proxyReq: fixRequestBody
        }
    })
);


// ============================================================
// ORDERS
// ============================================================

router.use(
    "/orders",
    createProxyMiddleware({
        target: process.env.ORDER_SERVICE_URL,
        changeOrigin: true,

        pathRewrite: (path) => {
            return "/api/v1/orders" +
                (path === "/" ? "" : path);
        },

        on: {
            proxyReq: fixRequestBody
        }
    })
);


// ============================================================
// INVENTORY
// ============================================================

router.use(
    "/inventory",
    createProxyMiddleware({
        target: process.env.INVENTORY_SERVICE_URL,
        changeOrigin: true,

        pathRewrite: (path) => {
            return "/api/v1/inventory" +
                (path === "/" ? "" : path);
        },

        on: {
            proxyReq: fixRequestBody
        }
    })
);


// ============================================================
// NOTIFICATIONS
// ============================================================

router.use(
    "/notifications",
    createProxyMiddleware({
        target: process.env.NOTIFICATION_SERVICE_URL,
        changeOrigin: true,

        pathRewrite: (path) => {
            return "/api/v1/notifications" +
                (path === "/" ? "" : path);
        },

        on: {
            proxyReq: fixRequestBody
        }
    })
);


// ============================================================
// ANALYTICS
// ============================================================

router.use(
    "/analytics",
    createProxyMiddleware({
        target: process.env.ANALYTICS_SERVICE_URL,
        changeOrigin: true,

        pathRewrite: (path) => {
            return "/api/v1/analytics" +
                (path === "/" ? "" : path);
        },

        on: {
            proxyReq: fixRequestBody
        }
    })
);


module.exports = router;