const { v4: uuidv4 } = require("uuid");

const cakeService = require("../services/cakeService");


const getCakes = async (req, res, next) => {

    try {

        const {
    name,
    category,
    minPrice,
    maxPrice,
    available,
    search,
    page = 0,
    size = 12,
    sortBy = "name",
    sortDir = "asc",
    includeRatings = "true"
} = req.query;

        if (Number(page) < 0) {
            return res.status(400).json({
                message: "page must be greater than or equal to 0"
            });
        }

        if (Number(size) < 1 || Number(size) > 100) {
            return res.status(400).json({
                message: "size must be between 1 and 100"
            });
        }

        for (const [key, value] of [
            ["minPrice", minPrice],
            ["maxPrice", maxPrice]
        ]) {

            if (
                value !== undefined &&
                value !== "" &&
                (isNaN(Number(value)) || Number(value) < 0)
            ) {
                return res.status(400).json({
                    message: `${key} must be a number greater than or equal to 0`
                });
            }
        }

        if (
            minPrice !== undefined &&
            maxPrice !== undefined &&
            Number(minPrice) > Number(maxPrice)
        ) {
            return res.status(400).json({
                message:
                    "minPrice must be less than or equal to maxPrice"
            });
        }

        const result = await cakeService.getCakes({
            name,
            category,
            minPrice,
            maxPrice,
            available:
                available === undefined
                    ? undefined
                    : available === "true",
            search,
            page,
            size,
            sortBy,
            sortDir,
            includeRatings: includeRatings !== "false"
        });

        res.status(200).json(result);

    } catch (error) {
        next(error);
    }
};


const getCakeById = async (req, res, next) => {

    try {

        const cake = await cakeService.getCakeById(
            req.params.cakeId
        );

        if (!cake) {
            return res.status(404).json({
                message: "Cake not found"
            });
        }

        res.status(200).json(cake);

    } catch (error) {
        next(error);
    }
};


const getCakesByIds = async (req, res, next) => {

    try {

        const ids = req.query.ids
            ? req.query.ids.split(",")
            : [];

        if (ids.length === 0) {
            return res.status(400).json({
                message: "ids parameter is required"
            });
        }

        if (ids.length > 200) {
            return res.status(400).json({
                message: "Maximum 200 ids allowed"
            });
        }

        const cakes = await cakeService.getCakesByIds(ids);

        res.status(200).json(cakes);

    } catch (error) {
        next(error);
    }
};


const getCategories = async (req, res, next) => {

    try {

        const categories =
            await cakeService.getCategories();

        res.status(200).json(categories);

    } catch (error) {
        next(error);
    }
};


const createCake = async (req, res, next) => {

    try {

        const {
            name,
            description,
            category,
            price,
            currency = "INR",
            available = true,
            stockQuantity = 0,
            imageUrl
        } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "name is required"
            });
        }

        if (!category) {
            return res.status(400).json({
                message: "category is required"
            });
        }

        if (
            price === undefined ||
            Number(price) < 0.01 ||
            Number(price) > 100000
        ) {
            return res.status(400).json({
                message: "price must be between 0.01 and 100000"
            });
        }

        if (Number(stockQuantity) < 0) {
            return res.status(400).json({
                message: "stockQuantity must be greater than or equal to 0"
            });
        }

        const cake = await cakeService.createCake({
            id: uuidv4(),
            name,
            description,
            category,
            price,
            currency,
            available,
            stockQuantity,
            imageUrl
        });

        res.status(201).json(cake);

    } catch (error) {
        next(error);
    }
};


const updateCake = async (req, res, next) => {

    try {

        const cake = await cakeService.getCakeById(
            req.params.cakeId
        );

        if (!cake) {
            return res.status(404).json({
                message: "Cake not found"
            });
        }

        const updatedCake =
            await cakeService.updateCake(
                req.params.cakeId,
                req.body
            );

        res.status(200).json(updatedCake);

    } catch (error) {
        next(error);
    }
};


const deleteCake = async (req, res, next) => {

    try {

        const deleted =
            await cakeService.deleteCake(
                req.params.cakeId
            );

        if (!deleted) {
            return res.status(404).json({
                message: "Cake not found"
            });
        }

        res.status(204).send();

    } catch (error) {
        next(error);
    }
};


module.exports = {
    getCakes,
    getCakeById,
    getCakesByIds,
    getCategories,
    createCake,
    updateCake,
    deleteCake
};