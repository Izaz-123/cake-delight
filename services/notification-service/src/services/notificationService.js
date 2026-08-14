const notificationRepository =
    require("../repositories/notificationRepository");


const processOrderCompleted = async (
    event
) => {

    const order =
        event.order;


    const channels =
        order.customer
            .notificationChannels || [];


    const results = [];


    for (
        const channel
        of channels
    ) {

        let recipient;


        if (channel === "EMAIL") {

            recipient =
                order.customer.email;

        } else if (channel === "SMS") {

            recipient =
                order.customer.phone;

        } else if (channel === "IN_APP") {

            recipient =
                order.customer.customerId;

        } else {

            console.log(
                `Unsupported channel: ${channel}`
            );

            continue;
        }


        /*
         * Check idempotency
         */

        const existing =
            await notificationRepository
                .findNotification(
                    event.eventId,
                    channel
                );


        if (existing) {

            console.log(
                `Notification already processed: ${event.eventId} / ${channel}`
            );

            results.push({
                channel,
                duplicate: true,
                status:
                    existing.status
            });

            continue;
        }


        /*
         * Create notification
         */

        const notificationId =
            await notificationRepository
                .createNotification({

                    eventId:
                        event.eventId,

                    orderId:
                        order.orderId,

                    customerId:
                        order.customer.customerId,

                    channel,

                    recipient,

                    subject:
                        `Order ${order.orderNumber} confirmed`,

                    message:
                        buildMessage(order),

                    status:
                        "PENDING"
                });


        try {

            /*
             * Simulate sending
             */

            await sendNotification(
                channel,
                recipient,
                order
            );


            await notificationRepository
                .markSent(
                    notificationId
                );


            results.push({
                channel,
                duplicate: false,
                status: "SENT"
            });


        } catch (error) {

            await notificationRepository
                .markFailed(
                    notificationId,
                    error.message
                );


            throw error;
        }
    }


    return results;
};


const sendNotification = async (
    channel,
    recipient,
    order
) => {

    console.log(
        "--------------------------------"
    );

    console.log(
        `Sending ${channel}`
    );

    console.log(
        `Recipient: ${recipient}`
    );

    console.log(
        `Order: ${order.orderNumber}`
    );

    console.log(
        `Total: ${order.totals.total} ${order.totals.currency}`
    );

    console.log(
        "--------------------------------"
    );


    /*
     * In the capstone we'll simulate
     * external providers.
     *
     * Later these can be replaced by
     * SendGrid / Twilio / Firebase etc.
     */

    return true;
};


const buildMessage = (
    order
) => {

    return `
Your Cake Delight order ${order.orderNumber}
has been confirmed.

Total:
${order.totals.total} ${order.totals.currency}

Items:
${order.items
    .map(
        item =>
            `${item.cakeName} x ${item.quantity}`
    )
    .join("\n")}

Delivery:
${order.deliveryAddress}
`.trim();
};


const getCustomerNotifications = async (
    customerId
) => {

    return await notificationRepository
        .getNotifications(
            customerId
        );
};


module.exports = {
    processOrderCompleted,
    getCustomerNotifications
};