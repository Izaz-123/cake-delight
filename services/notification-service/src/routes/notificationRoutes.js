const express = require("express");

const {
    getNotifications,
    getNotificationsForCurrentCustomer
} = require("../controllers/notificationController");


const router = express.Router();


// The gateway/frontend identifies the current customer with this header.
// The explicit customer route is kept for administration and debugging.

router.get("/", getNotificationsForCurrentCustomer);

router.get("/customer/:customerId", getNotifications);


module.exports = router;
