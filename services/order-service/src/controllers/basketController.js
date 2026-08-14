const basketService =
    require("../services/basketService");


const getBasket = async (
    req,
    res,
    next
) => {

    try {

        const basket =
            await basketService.buildBasket(
                req.customerId
            );

        res.status(200).json(basket);

    } catch (error) {

        next(error);
    }
};


const addItem = async (
    req,
    res,
    next
) => {

    try {

        const {
            cakeId,
            quantity
        } = req.body;


        if (!cakeId) {

            return res.status(400).json({
                message:
                    "cakeId is required"
            });
        }


        if (
            !Number.isInteger(
                Number(quantity)
            ) ||
            Number(quantity) < 1 ||
            Number(quantity) > 50
        ) {

            return res.status(400).json({
                message:
                    "quantity must be between 1 and 50"
            });
        }


        const basket =
            await basketService.addItem(
                req.customerId,
                cakeId,
                Number(quantity)
            );


        res.status(200).json(basket);

    } catch (error) {

        next(error);
    }
};


const updateItem = async (
    req,
    res,
    next
) => {

    try {

        const {
            quantity
        } = req.body;


        if (
            !Number.isInteger(
                Number(quantity)
            ) ||
            Number(quantity) < 1 ||
            Number(quantity) > 50
        ) {

            return res.status(400).json({
                message:
                    "quantity must be between 1 and 50"
            });
        }


        const basket =
            await basketService.updateItem(
                req.customerId,
                req.params.cakeId,
                Number(quantity)
            );


        res.status(200).json(basket);

    } catch (error) {

        next(error);
    }
};


const removeItem = async (
    req,
    res,
    next
) => {

    try {

        const basket =
            await basketService.removeItem(
                req.customerId,
                req.params.cakeId
            );

        res.status(200).json(basket);

    } catch (error) {

        next(error);
    }
};


const clearBasket = async (
    req,
    res,
    next
) => {

    try {

        const basket =
            await basketService.clearBasket(
                req.customerId
            );

        res.status(200).json(basket);

    } catch (error) {

        next(error);
    }
};


module.exports = {
    getBasket,
    addItem,
    updateItem,
    removeItem,
    clearBasket
};