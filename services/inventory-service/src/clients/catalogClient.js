const CATALOG_SERVICE_URL =
    process.env.CATALOG_SERVICE_URL ||
    "http://localhost:8081";


/*
 * Read-only lookup used to provision a stock row for a cake that the
 * Inventory Service has never seen. The Catalog Service remains the owner
 * of product data; inventory only mirrors the opening stock level.
 *
 * Returns null when the catalogue is unreachable so the caller can fall
 * back to the data carried on the order event.
 */

const getCake = async (cakeId) => {

    try {

        const response = await fetch(
            `${CATALOG_SERVICE_URL}/api/v1/cakes/${encodeURIComponent(cakeId)}`,
            {
                signal: AbortSignal.timeout(3000)
            }
        );

        if (!response.ok) {
            return null;
        }

        return await response.json();

    } catch (error) {

        console.error(
            "Catalog Service unavailable:",
            error.message
        );

        return null;
    }
};


module.exports = {
    getCake
};
