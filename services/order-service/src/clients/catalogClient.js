const axios = require("axios");

const catalogClient = axios.create({
    baseURL: process.env.CATALOG_SERVICE_URL,
    timeout: 2000
});


const getCake = async (cakeId) => {

    try {

        const response =
            await catalogClient.get(
                `/api/v1/cakes/${cakeId}`
            );

        return response.data;

    } catch (error) {

        if (
            error.response &&
            error.response.status === 404
        ) {
            return null;
        }

        throw error;
    }
};


const getCakesByIds = async (cakeIds) => {

    const response =
        await catalogClient.get(
            "/api/v1/cakes/batch",
            {
                params: {
                    ids: cakeIds.join(",")
                }
            }
        );

    return response.data;
};


module.exports = {
    getCake,
    getCakesByIds
};