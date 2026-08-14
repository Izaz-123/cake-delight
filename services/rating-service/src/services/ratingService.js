const { v4: uuidv4 } = require("uuid");

const ratingRepository =
    require("../repositories/ratingRepository");

const orderClient =
    require("../clients/orderClient");


const createOrUpdateRating = async (data) => {

    const order = await orderClient.getOrderForCustomer(
        data.orderId,
        data.customerId
    );

    if (!order) {
        const error = new Error("Order not found for this customer");
        error.status = 404;
        throw error;
    }

    const itemWasPurchased = (order.items || []).some(
        item => item.cakeId === data.cakeId
    );

    if (!itemWasPurchased) {
        const error = new Error("This cake was not purchased in the selected order");
        error.status = 403;
        throw error;
    }

    return await ratingRepository.createOrUpdateRating({
        id: uuidv4(),

        cakeId: data.cakeId,
        customerId: data.customerId,
        stars: data.stars,
        review: data.review,
        orderId: data.orderId
    });
};


const getRatingById = async (ratingId) => {

    return await ratingRepository.getRatingById(
        ratingId
    );
};


const getRatingsByCake = async (
    cakeId,
    page,
    size
) => {

    const result =
        await ratingRepository.getRatingsByCake(
            cakeId,
            page,
            size
        );

    return createPageResponse(
        result,
        page,
        size
    );
};


const getRatingsByCustomer = async (
    customerId,
    page,
    size
) => {

    const result =
        await ratingRepository.getRatingsByCustomer(
            customerId,
            page,
            size
        );

    return createPageResponse(
        result,
        page,
        size
    );
};


const getCakeSummary = async (cakeId) => {

    return await ratingRepository.getCakeSummary(
        cakeId
    );
};


const getBulkSummaries = async (cakeIds) => {

    return await ratingRepository.getBulkSummaries(
        cakeIds
    );
};


const deleteRating = async (ratingId) => {

    return await ratingRepository.deleteRating(
        ratingId
    );
};


const createPageResponse = (
    result,
    page,
    size
) => {

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


module.exports = {
    createOrUpdateRating,
    getRatingById,
    getRatingsByCake,
    getRatingsByCustomer,
    getCakeSummary,
    getBulkSummaries,
    deleteRating
};
