const express = require("express");

const {
    getSummary,
    getTopCakes,
    getDailyRevenue
} = require("../controllers/analyticsController");


const router = express.Router();


router.get(
    "/summary",
    getSummary
);


router.get(
    "/top-cakes",
    getTopCakes
);


router.get(
    "/daily-revenue",
    getDailyRevenue
);


module.exports = router;