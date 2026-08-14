const express = require("express");

const {
    createRating,
    getRatingById,
    getRatingsByCake,
    getRatingsByCustomer,
    getCakeSummary,
    getBulkSummaries,
    deleteRating
} = require("../controllers/ratingController");

const router = express.Router();


// IMPORTANT:
// Specific routes before /:ratingId

router.post("/", createRating);

router.get("/summary", getBulkSummaries);

router.get(
    "/cake/:cakeId/summary",
    getCakeSummary
);

router.get(
    "/cake/:cakeId",
    getRatingsByCake
);

router.get(
    "/customer/:customerId",
    getRatingsByCustomer
);

router.get(
    "/:ratingId",
    getRatingById
);

router.delete(
    "/:ratingId",
    deleteRating
);


module.exports = router;