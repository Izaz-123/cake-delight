const pool = require("../config/db");

const orderRepository =
    require("../repositories/orderRepository");

const catalogClient =
    require("../clients/catalogClient");

const {
    generateOrderNumber
} = require("../utils/orderNumber");

const {
    v4: uuidv4
} = require("uuid");


const DELIVERY_FEE =
    Number(
        process.env.DELIVERY_FEE || 5.99
    );

const FREE_DELIVERY_THRESHOLD =
    Number(
        process.env.FREE_DELIVERY_THRESHOLD || 75
    );

const TAX_RATE =
    Number(
        process.env.TAX_RATE || 0.05
    );



const checkout = async (
    customerId,
    checkoutData
) => {

    // =========================================
    // 1. Get current basket
    // =========================================

    const basketConnection =
        await pool.getConnection();

    let basket;

    try {

        basket =
            await orderRepository.getBasketForCheckout(
                basketConnection,
                customerId
            );

    } finally {

        basketConnection.release();
    }


    if (
        !basket ||
        basket.items.length === 0
    ) {

        const error =
            new Error("Basket is empty");

        error.status = 400;

        throw error;
    }



    // =========================================
    // 2. Resolve current catalog data
    // =========================================

    const cakeIds =
        basket.items.map(
            item => item.cakeId
        );


    const cakes =
        await catalogClient.getCakesByIds(
            cakeIds
        );


    const cakeMap =
        new Map();


    cakes.forEach(cake => {

        cakeMap.set(
            cake.id,
            cake
        );

    });



    // =========================================
    // 3. Re-price and validate
    // =========================================

    const orderItems = [];

    let subtotal = 0;


    for (
        const basketItem
        of basket.items
    ) {

        const cake =
            cakeMap.get(
                basketItem.cakeId
            );


        // Cake doesn't exist anymore
        if (!cake) {

            const error =
                new Error(
                    `Cake ${basketItem.cakeId} no longer exists`
                );

            error.status = 409;

            throw error;
        }


        // Cake is unavailable
        if (!cake.available) {

            const error =
                new Error(
                    `${cake.name} is no longer available`
                );

            error.status = 409;

            throw error;
        }


        // Not enough stock
        if (
            basketItem.quantity >
            cake.stockQuantity
        ) {

            const error =
                new Error(
                    `${cake.name} does not have enough stock`
                );

            error.status = 409;

            throw error;
        }


        // Get CURRENT price from Catalog
        const unitPrice =
            Number(cake.price);


        // Calculate line total
        const lineTotal =
            unitPrice *
            basketItem.quantity;


        subtotal += lineTotal;


        // Create order item
        orderItems.push({

            cakeId:
                cake.id,

            cakeName:
                cake.name,

            imageUrl:
                cake.imageUrl,

            unitPrice,

            quantity:
                basketItem.quantity,

            lineTotal:
                round(lineTotal)
        });
    }



    // =========================================
    // 4. Calculate totals
    // =========================================

    subtotal =
        round(subtotal);


    const deliveryFee =
        subtotal >= FREE_DELIVERY_THRESHOLD
            ? 0
            : DELIVERY_FEE;


    const tax =
        round(
            subtotal * TAX_RATE
        );


    const total =
        round(
            subtotal +
            deliveryFee +
            tax
        );



    // =========================================
    // 5. Start database transaction
    // =========================================

    const connection =
        await pool.getConnection();


    try {

        await connection.beginTransaction();



        // =====================================
        // 6. Create order
        // =====================================

        const orderId =
            uuidv4();


        const orderNumber =
            generateOrderNumber();


        const placedAt =
            new Date();


        const order = {

            id:
                orderId,

            orderNumber,

            customerId,

            customerName:
                checkoutData.customerName,

            customerEmail:
                checkoutData.customerEmail,

            customerPhone:
                checkoutData.customerPhone ||
                null,

            deliveryAddress:
                checkoutData.deliveryAddress,

            deliveryNotes:
                checkoutData.deliveryNotes ||
                null,

            notificationChannels:
                checkoutData.notificationChannels,

            status:
                "CONFIRMED",

            subtotal,

            deliveryFee,

            tax,

            total,

            currency:
                "USD",

            placedAt
        };


        await orderRepository.createOrder(
            connection,
            order
        );



        // =====================================
        // 7. Create order items
        // =====================================

        await orderRepository.createOrderItems(
            connection,
            orderId,
            orderItems
        );



        // =====================================
        // 8. Clear basket
        // =====================================

        await orderRepository.clearBasket(
            connection,
            basket.basketId
        );



        // =====================================
        // 9. Create order.completed event
        // =====================================

        const eventId =
            uuidv4();


        const correlationId =
            checkoutData.correlationId ||
            null;


        const eventPayload = {

            eventId,

            eventType:
                "order.completed",

            eventVersion:
                1,

            occurredAt:
                placedAt.toISOString(),

            correlationId,

            order: {

                orderId,

                orderNumber,

                status:
                    "CONFIRMED",

                placedAt:
                    placedAt.toISOString(),


                // -----------------------------
                // Customer
                // -----------------------------

                customer: {

                    customerId,

                    name:
                        checkoutData.customerName,

                    email:
                        checkoutData.customerEmail,

                    phone:
                        checkoutData.customerPhone ||
                        undefined,

                    notificationChannels:
                        checkoutData.notificationChannels
                },


                // -----------------------------
                // Items
                // -----------------------------

                items:
                    orderItems.map(item => ({

                        cakeId:
                            item.cakeId,

                        cakeName:
                            item.cakeName,

                        quantity:
                            item.quantity,

                        unitPrice:
                            item.unitPrice,

                        lineTotal:
                            item.lineTotal
                    })),


                // -----------------------------
                // Totals
                // -----------------------------

                totals: {

                    subtotal,

                    deliveryFee,

                    tax,

                    total,

                    currency:
                        "USD",

                    itemCount:
                        orderItems.reduce(
                            (
                                sum,
                                item
                            ) =>
                                sum +
                                item.quantity,
                            0
                        )
                },


                // -----------------------------
                // Delivery
                // -----------------------------

                deliveryAddress:
                    checkoutData.deliveryAddress,

                deliveryNotes:
                    checkoutData.deliveryNotes ||
                    undefined
            }
        };



        // =====================================
        // 10. Save event in outbox
        // =====================================

        await orderRepository.createOutboxEvent(
            connection,
            {

                id:
                    uuidv4(),

                eventId,

                eventType:
                    "order.completed",

                aggregateId:
                    orderId,

                payload:
                    eventPayload
            }
        );



        // =====================================
        // 11. Commit transaction
        // =====================================

        await connection.commit();



        // =====================================
        // 12. Return created order
        // =====================================

        return {

            ...order,

            ratable:
                true,

            items:
                orderItems
        };


    } catch (error) {

        // =====================================
        // Rollback if anything fails
        // =====================================

        await connection.rollback();

        throw error;


    } finally {

        // =====================================
        // Always release connection
        // =====================================

        connection.release();
    }
};
const getOrders = async (
    customerId,
    page,
    size,
    status
) => {

    const result =
        await orderRepository.getOrdersByCustomer(
            customerId,
            page,
            size,
            status
        );

    const totalPages =
        Math.ceil(result.total / size);

    return {
        content: result.rows,

        page,

        size,

        totalElements: result.total,

        totalPages,

        first: page === 0,

        last:
            totalPages === 0 ||
            page >= totalPages - 1
    };
};


const getOrderById = async (
    orderId,
    customerId
) => {

    return await orderRepository.getOrderById(
        orderId,
        customerId
    );
};


const getOrderByNumber = async (
    orderNumber,
    customerId
) => {

    return await orderRepository.getOrderByNumber(
        orderNumber,
        customerId
    );
};

const STATUS_TRANSITIONS = {

    PENDING: [
        "CONFIRMED",
        "CANCELLED"
    ],

    CONFIRMED: [
        "PREPARING",
        "CANCELLED"
    ],

    PREPARING: [
        "OUT_FOR_DELIVERY"
    ],

    OUT_FOR_DELIVERY: [
        "DELIVERED"
    ],

    DELIVERED: [],

    CANCELLED: []
};


const updateStatus = async (
    orderId,
    customerId,
    newStatus
) => {

    const order =
        await orderRepository.getOrderStatus(
            orderId,
            customerId
        );

    if (!order) {

        const error =
            new Error("Order not found");

        error.status = 404;

        throw error;
    }


    const currentStatus =
        order.status;


    const allowed =
        STATUS_TRANSITIONS[
            currentStatus
        ] || [];


    if (
        !allowed.includes(
            newStatus
        )
    ) {

        const error =
            new Error(
                `Cannot change order status from ${currentStatus} to ${newStatus}`
            );

        error.status = 409;

        throw error;
    }


    await orderRepository.updateOrderStatus(
        orderId,
        customerId,
        newStatus
    );


    return await orderRepository.getOrderById(
        orderId,
        customerId
    );
};

const cancelOrder = async (
    orderId,
    customerId
) => {

    const order =
        await orderRepository.getOrderById(
            orderId,
            customerId
        );

    if (!order) {

        const error =
            new Error("Order not found");

        error.status = 404;

        throw error;
    }


    if (
        order.status !== "PENDING" &&
        order.status !== "CONFIRMED"
    ) {

        const error =
            new Error(
                "Order can no longer be cancelled"
            );

        error.status = 409;

        throw error;
    }


    await orderRepository.updateOrderStatus(
        orderId,
        customerId,
        "CANCELLED"
    );


    return await orderRepository.getOrderById(
        orderId,
        customerId
    );
};


// =============================================
// Helper function
// =============================================

const round = number =>
    Number(
        number.toFixed(2)
    );



// =============================================
// Exports
// =============================================

module.exports = {
    checkout,

    getOrders,
    getOrderById,
    getOrderByNumber,

    updateStatus,
    cancelOrder
};