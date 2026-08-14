const express = require("express");

const {
    getCakes,
    getCakeById,
    getCakesByIds,
    getCategories,
    createCake,
    updateCake,
    deleteCake
} = require("../controllers/cakeController");

const router = express.Router();


router.get("/", getCakes);

router.get("/batch", getCakesByIds);

router.get("/categories", getCategories);

router.get("/:cakeId", getCakeById);

router.post("/", createCake);

router.put("/:cakeId", updateCake);

router.delete("/:cakeId", deleteCake);


module.exports = router;