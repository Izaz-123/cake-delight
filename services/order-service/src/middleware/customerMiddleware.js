const customerMiddleware = (req, res, next) => {

    const customerId =
        req.headers["x-customer-id"];

    if (!customerId) {

        return res.status(400).json({
            message: "X-Customer-Id header is required"
        });
    }

    req.customerId = customerId;

    next();
};

module.exports = customerMiddleware;