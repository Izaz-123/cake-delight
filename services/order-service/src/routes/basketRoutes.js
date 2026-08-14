const express = require("express");

const {
    getBasket,
    addItem,
    updateItem,
    removeItem,
    clearBasket
} = require("../controllers/basketController");

const customerMiddleware =
    require("../middleware/customerMiddleware");

const router = express.Router();


router.use(customerMiddleware);


router.get(
    "/",
    getBasket
);


router.post(
    "/items",
    addItem
);


router.put(
    "/items/:cakeId",
    updateItem
);


router.delete(
    "/items/:cakeId",
    removeItem
);


router.delete(
    "/",
    clearBasket
);


module.exports = router;