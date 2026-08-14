const ORDER_SERVICE_URL =
    process.env.ORDER_SERVICE_URL ||
    "http://localhost:8083";

const getOrderForCustomer = async (orderId, customerId) => {
    const response = await fetch(
        `${ORDER_SERVICE_URL}/api/v1/orders/${encodeURIComponent(orderId)}`,
        {
            headers: {
                "X-Customer-Id": customerId
            },
            signal: AbortSignal.timeout(3000)
        }
    );

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error("Unable to verify the purchased cake");
    }

    return response.json();
};

module.exports = {
    getOrderForCustomer
};
