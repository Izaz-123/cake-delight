const axios = require("axios");

const ratingClient = axios.create({
    baseURL: process.env.RATING_SERVICE_URL,
    timeout: 2000
});


const getRatingSummaries = async (cakeIds) => {

    if (!cakeIds || cakeIds.length === 0) {
        return [];
    }

    try {

        const response = await ratingClient.get(
            "/api/v1/ratings/summary",
            {
                params: {
                    cakeIds: cakeIds.join(",")
                }
            }
        );

        return response.data;

    } catch (error) {

        console.error(
            "Rating Service unavailable:",
            error.message
        );

        // IMPORTANT:
        // Catalog should continue working
        // even when Rating Service is down.

        return null;
    }
};


module.exports = {
    getRatingSummaries
};