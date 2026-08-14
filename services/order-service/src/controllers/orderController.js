const orderService =
    require("../services/orderService");


const checkout = async (
    req,
    res,
    next
) => {

    try {

        const {
            customerName,
            customerEmail,
            customerPhone,
            deliveryAddress,
            deliveryNotes,
            notificationChannels = [
                "EMAIL"
            ]
        } = req.body;


        /*
         * Customer Name
         */

        if (!customerName) {

            return res.status(400).json({
                message:
                    "customerName is required"
            });
        }


        if (customerName.length > 160) {

            return res.status(400).json({
                message:
                    "customerName must not exceed 160 characters"
            });
        }


        /*
         * Email
         */

        if (!customerEmail) {

            return res.status(400).json({
                message:
                    "customerEmail is required"
            });
        }


        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!emailRegex.test(customerEmail)) {

            return res.status(400).json({
                message:
                    "customerEmail must be valid"
            });
        }


        /*
         * Phone
         */

        if (customerPhone) {

            const phoneRegex =
                /^\+?[0-9]{7,20}$/;


            if (!phoneRegex.test(customerPhone)) {

                return res.status(400).json({
                    message:
                        "customerPhone must contain 7 to 20 digits"
                });
            }
        }


        /*
         * Address
         */

        if (!deliveryAddress) {

            return res.status(400).json({
                message:
                    "deliveryAddress is required"
            });
        }


        /*
         * Notification Channels
         */

        const allowedChannels = [
            "EMAIL",
            "SMS",
            "IN_APP"
        ];


        if (
            !Array.isArray(
                notificationChannels
            )
        ) {

            return res.status(400).json({
                message:
                    "notificationChannels must be an array"
            });
        }


        for (
            const channel
            of notificationChannels
        ) {

            if (
                !allowedChannels.includes(
                    channel
                )
            ) {

                return res.status(400).json({
                    message:
                        `Invalid notification channel: ${channel}`
                });
            }
        }


        /*
         * SMS requires phone
         */

        if (
            notificationChannels.includes("SMS") &&
            !customerPhone
        ) {

            return res.status(400).json({
                message:
                    "customerPhone is required when SMS notification is selected"
            });
        }


        /*
         * Checkout
         */

        const order =
            await orderService.checkout(
                req.customerId,
                {
                    customerName,
                    customerEmail,
                    customerPhone,
                    deliveryAddress,
                    deliveryNotes,
                    notificationChannels,

                    correlationId:
                        req.headers[
                            "x-correlation-id"
                        ] || null
                }
            );


        res.status(201).json(order);

    } catch (error) {

        next(error);
    }
};
const getOrders = async (
    req,
    res,
    next
) => {

    try {

        const page =
            Number(req.query.page || 0);

        const size =
            Number(req.query.size || 20);

        const status =
            req.query.status;


        if (page < 0) {

            return res.status(400).json({
                message:
                    "page must be greater than or equal to 0"
            });
        }


        if (
            size < 1 ||
            size > 100
        ) {

            return res.status(400).json({
                message:
                    "size must be between 1 and 100"
            });
        }


        const allowedStatuses = [
            "PENDING",
            "CONFIRMED",
            "PREPARING",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "CANCELLED"
        ];


        if (
            status &&
            !allowedStatuses.includes(status)
        ) {

            return res.status(400).json({
                message:
                    "Invalid order status"
            });
        }


        const result =
            await orderService.getOrders(
                req.customerId,
                page,
                size,
                status
            );


        res.status(200).json(result);

    } catch (error) {

        next(error);
    }
};

const getOrderById = async (
    req,
    res,
    next
) => {

    try {

        const order =
            await orderService.getOrderById(
                req.params.orderId,
                req.customerId
            );


        if (!order) {

            return res.status(404).json({
                message:
                    "Order not found"
            });
        }


        res.status(200).json(order);

    } catch (error) {

        next(error);
    }
};

const getOrderByNumber = async (
    req,
    res,
    next
) => {

    try {

        const order =
            await orderService.getOrderByNumber(
                req.params.orderNumber,
                req.customerId
            );


        if (!order) {

            return res.status(404).json({
                message:
                    "Order not found"
            });
        }


        res.status(200).json(order);

    } catch (error) {

        next(error);
    }
};

const updateStatus = async (
    req,
    res,
    next
) => {

    try {

        const {
            status
        } = req.body;


        const allowedStatuses = [
            "PENDING",
            "CONFIRMED",
            "PREPARING",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "CANCELLED"
        ];


        if (
            !allowedStatuses.includes(status)
        ) {

            return res.status(400).json({
                message:
                    "Invalid order status"
            });
        }


        const order =
            await orderService.updateStatus(
                req.params.orderId,
                req.customerId,
                status
            );


        res.status(200).json(order);

    } catch (error) {

        next(error);
    }
};

const cancelOrder = async (
    req,
    res,
    next
) => {

    try {

        const order =
            await orderService.cancelOrder(
                req.params.orderId,
                req.customerId
            );


        res.status(200).json(order);

    } catch (error) {

        next(error);
    }
};


module.exports = {
    checkout,

    getOrders,
    getOrderById,
    getOrderByNumber,

    updateStatus,
    cancelOrder
};