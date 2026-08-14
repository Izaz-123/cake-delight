const notificationService =
    require("../services/notificationService");


const getNotifications = async (
    req,
    res,
    next
) => {

    try {

        const notifications =
            await notificationService
                .getCustomerNotifications(
                    req.params.customerId
                );


        res.status(200).json(
            notifications
        );

    } catch (error) {

        next(error);
    }
};


const getNotificationsForCurrentCustomer = async (
    req,
    res,
    next
) => {

    try {

        const customerId =
            req.headers["x-customer-id"];


        if (!customerId) {

            return res.status(400).json({
                message:
                    "X-Customer-Id header is required"
            });
        }


        const notifications =
            await notificationService
                .getCustomerNotifications(
                    customerId
                );


        res.status(200).json(
            notifications
        );

    } catch (error) {

        next(error);
    }
};


module.exports = {
    getNotifications,
    getNotificationsForCurrentCustomer
};
