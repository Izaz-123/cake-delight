const ratingService =
    require("../services/ratingService");


// POST /api/v1/ratings
const createRating = async (req, res, next) => {

    try {

        const {
            cakeId,
            stars: starsInput,
            rating: ratingInput,
            review,
            orderId
        } = req.body;

        const customerId = req.headers["x-customer-id"];
        const starsVal = starsInput !== undefined ? starsInput : ratingInput;

        if (!cakeId) {
            return res.status(400).json({
                message: "cakeId is required"
            });
        }

        if (!customerId) {
            return res.status(400).json({
                message: "customerId is required"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "orderId is required to review a purchased cake"
            });
        }

        if (
            starsVal === undefined ||
            !Number.isInteger(Number(starsVal)) ||
            Number(starsVal) < 1 ||
            Number(starsVal) > 5
        ) {
            return res.status(400).json({
                message: "stars must be an integer between 1 and 5"
            });
        }

        if (
            review !== undefined &&
            review !== null &&
            review.length > 1000
        ) {
            return res.status(400).json({
                message: "review must not exceed 1000 characters"
            });
        }

        const rating = await ratingService.createOrUpdateRating({
            cakeId,
            customerId,
            stars: Number(starsVal),
            review,
            orderId
        });

        res.status(201).json(rating);

    } catch (error) {
        next(error);
    }
};


// GET /api/v1/ratings/:ratingId
const getRatingById = async (
    req,
    res,
    next
) => {

    try {

        const rating =
            await ratingService.getRatingById(
                req.params.ratingId
            );

        if (!rating) {

            return res.status(404).json({
                message: "Rating not found"
            });
        }

        res.status(200).json(rating);

    } catch (error) {

        next(error);
    }
};


// GET /api/v1/ratings/cake/:cakeId
const getRatingsByCake = async (
    req,
    res,
    next
) => {

    try {

        const page =
            Number(req.query.page || 0);

        const size =
            Number(req.query.size || 20);


        if (page < 0) {

            return res.status(400).json({
                message:
                    "page must be greater than or equal to 0"
            });
        }


        if (size < 1 || size > 100) {

            return res.status(400).json({
                message:
                    "size must be between 1 and 100"
            });
        }


        const result =
            await ratingService.getRatingsByCake(
                req.params.cakeId,
                page,
                size
            );


        res.status(200).json(result);

    } catch (error) {

        next(error);
    }
};


// GET /api/v1/ratings/customer/:customerId
const getRatingsByCustomer = async (
    req,
    res,
    next
) => {

    try {

        const page =
            Number(req.query.page || 0);

        const size =
            Number(req.query.size || 20);


        if (page < 0) {

            return res.status(400).json({
                message:
                    "page must be greater than or equal to 0"
            });
        }


        if (size < 1 || size > 100) {

            return res.status(400).json({
                message:
                    "size must be between 1 and 100"
            });
        }


        const result =
            await ratingService.getRatingsByCustomer(
                req.params.customerId,
                page,
                size
            );


        res.status(200).json(result);

    } catch (error) {

        next(error);
    }
};


// GET /api/v1/ratings/cake/:cakeId/summary
const getCakeSummary = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ratingService.getCakeSummary(
                req.params.cakeId
            );

        res.status(200).json(result);

    } catch (error) {

        next(error);
    }
};


// GET /api/v1/ratings/summary?cakeIds=id1,id2
const getBulkSummaries = async (
    req,
    res,
    next
) => {

    try {

        if (!req.query.cakeIds) {

            return res.status(400).json({
                message:
                    "cakeIds parameter is required"
            });
        }


        const cakeIds =
            req.query.cakeIds.split(",");


        const result =
            await ratingService.getBulkSummaries(
                cakeIds
            );


        res.status(200).json(result);

    } catch (error) {

        next(error);
    }
};


// DELETE /api/v1/ratings/:ratingId
const deleteRating = async (
    req,
    res,
    next
) => {

    try {

        const deleted =
            await ratingService.deleteRating(
                req.params.ratingId
            );


        if (!deleted) {

            return res.status(404).json({
                message: "Rating not found"
            });
        }


        res.status(204).send();

    } catch (error) {

        next(error);
    }
};


module.exports = {
    createRating,
    getRatingById,
    getRatingsByCake,
    getRatingsByCustomer,
    getCakeSummary,
    getBulkSummaries,
    deleteRating
};
