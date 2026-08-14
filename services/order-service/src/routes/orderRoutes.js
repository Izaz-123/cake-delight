const express = require("express");

const {
    checkout,
    getOrders,
    getOrderById,
    getOrderByNumber,
    updateStatus,
    cancelOrder
} = require("../controllers/orderController");

const customerMiddleware =
    require("../middleware/customerMiddleware");

const router = express.Router();


router.use(customerMiddleware);


/*
 * IMPORTANT:
 * Specific routes first.
 */

router.post(
    "/checkout",
    checkout
);


router.get(
    "/by-number/:orderNumber",
    getOrderByNumber
);


router.get(
    "/",
    getOrders
);


router.get(
    "/:orderId",
    getOrderById
);


router.patch(
    "/:orderId/status",
    updateStatus
);


router.post(
    "/:orderId/cancel",
    cancelOrder
);


module.exports = router;