const analyticsService =
    require("../services/analyticsService");


const getSummary = async (
    req,
    res,
    next
) => {

    try {

        const summary =
            await analyticsService
                .getSummary();


        res.status(200).json(
            summary
        );

    } catch (error) {

        next(error);
    }
};


const getTopCakes = async (
    req,
    res,
    next
) => {

    try {

        const limit =
            Number(
                req.query.limit || 10
            );


        if (
            limit < 1 ||
            limit > 100
        ) {

            return res.status(400).json({
                message:
                    "limit must be between 1 and 100"
            });
        }


        const cakes =
            await analyticsService
                .getTopCakes(limit);


        res.status(200).json(
            cakes
        );

    } catch (error) {

        next(error);
    }
};


const getDailyRevenue = async (
    req,
    res,
    next
) => {

    try {

        const data =
            await analyticsService
                .getDailyRevenue();


        res.status(200).json(
            data
        );

    } catch (error) {

        next(error);
    }
};


module.exports = {
    getSummary,
    getTopCakes,
    getDailyRevenue
};