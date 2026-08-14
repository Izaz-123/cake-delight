const basketRepository =
    require("../repositories/basketRepository");

const catalogClient =
    require("../clients/catalogClient");


const DELIVERY_FEE =
    Number(process.env.DELIVERY_FEE || 99);

const FREE_DELIVERY_THRESHOLD =
    Number(
        process.env.FREE_DELIVERY_THRESHOLD || 75
    );

const TAX_RATE =
    Number(process.env.TAX_RATE || 0.5);


const buildBasket = async (customerId) => {

    const basketId =
        await basketRepository.getOrCreateBasket(
            customerId
        );

    const items =
        await basketRepository.getBasketItems(
            basketId
        );


    let subtotal = 0;

    const formattedItems =
        items.map(item => {

            const unitPrice =
                Number(item.unitPrice);

            const lineTotal =
                unitPrice * item.quantity;

            subtotal += lineTotal;

            return {
                ...item,

                unitPrice,

                lineTotal
            };
        });


    const deliveryFee =
        subtotal >= FREE_DELIVERY_THRESHOLD
            ? 0
            : subtotal > 0
                ? DELIVERY_FEE
                : 0;


    const tax =
        subtotal * TAX_RATE;


    const total =
        subtotal +
        deliveryFee +
        tax;


    const itemCount =
        formattedItems.reduce(
            (sum, item) =>
                sum + item.quantity,
            0
        );


    return {

        basketId,

        customerId,

        items: formattedItems,

        itemCount,

        subtotal: round(subtotal),

        deliveryFee: round(deliveryFee),

        tax: round(tax),

        total: round(total),

        currency: "INR",

        updatedAt:
            new Date().toISOString()
    };
};


const addItem = async (
    customerId,
    cakeId,
    quantity
) => {

    const cake =
        await catalogClient.getCake(cakeId);


    if (!cake) {

        const error =
            new Error("Cake not found");

        error.status = 404;

        throw error;
    }


    if (!cake.available) {

        const error =
            new Error("Cake is unavailable");

        error.status = 400;

        throw error;
    }


    const basketId =
        await basketRepository.getOrCreateBasket(
            customerId
        );


    const existing =
        await basketRepository.findBasketItem(
            basketId,
            cakeId
        );


    const resultingQuantity =
        existing
            ? existing.quantity + quantity
            : quantity;


    if (
        resultingQuantity >
        cake.stockQuantity
    ) {

        const error =
            new Error(
                "Requested quantity exceeds available stock"
            );

        error.status = 400;

        throw error;
    }


    if (existing) {

        await basketRepository.updateBasketItemQuantity(
            basketId,
            cakeId,
            resultingQuantity
        );

    } else {

        await basketRepository.createBasketItem(
            basketId,
            {
                cakeId: cake.id,
                cakeName: cake.name,
                imageUrl: cake.imageUrl,
                unitPrice: Number(cake.price),
                quantity
            }
        );
    }


    return await buildBasket(customerId);
};


const updateItem = async (
    customerId,
    cakeId,
    quantity
) => {

    const cake =
        await catalogClient.getCake(cakeId);


    if (!cake) {

        const error =
            new Error("Cake not found");

        error.status = 404;

        throw error;
    }


    if (!cake.available) {

        const error =
            new Error("Cake is unavailable");

        error.status = 400;

        throw error;
    }


    if (
        quantity >
        cake.stockQuantity
    ) {

        const error =
            new Error(
                "Requested quantity exceeds available stock"
            );

        error.status = 400;

        throw error;
    }


    const basketId =
        await basketRepository.getOrCreateBasket(
            customerId
        );


    const existing =
        await basketRepository.findBasketItem(
            basketId,
            cakeId
        );


    if (!existing) {

        const error =
            new Error("Basket item not found");

        error.status = 404;

        throw error;
    }


    await basketRepository.updateBasketItemQuantity(
        basketId,
        cakeId,
        quantity
    );


    return await buildBasket(customerId);
};


const removeItem = async (
    customerId,
    cakeId
) => {

    const basketId =
        await basketRepository.getOrCreateBasket(
            customerId
        );


    const deleted =
        await basketRepository.deleteBasketItem(
            basketId,
            cakeId
        );


    if (!deleted) {

        const error =
            new Error("Basket item not found");

        error.status = 404;

        throw error;
    }


    return await buildBasket(customerId);
};


const clearBasket = async (customerId) => {

    const basketId =
        await basketRepository.getOrCreateBasket(
            customerId
        );

    await basketRepository.clearBasket(
        basketId
    );

    return await buildBasket(customerId);
};


const round = number =>
    Number(number.toFixed(2));


module.exports = {
    buildBasket,
    addItem,
    updateItem,
    removeItem,
    clearBasket
};