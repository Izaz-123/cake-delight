const cakeRepository = require("../repositories/cakeRepository");
const ratingClient =
    require("../clients/ratingClient");

const getCakes = async (filters) => {

    const {
        page = 0,
        size = 12,
        sortBy = "name",
        sortDir = "asc",
        includeRatings = true
    } = filters;


    const result =
        await cakeRepository.getCakes({
            ...filters,
            page: Number(page),
            size: Number(size),
            sortBy,
            sortDir
        });


    let cakes = result.rows;


    // --------------------------------
    // Get ratings
    // --------------------------------

    if (
        includeRatings === true &&
        cakes.length > 0
    ) {

        const cakeIds = cakes.map(
            cake => cake.id
        );


        const summaries =
            await ratingClient.getRatingSummaries(
                cakeIds
            );


        if (summaries !== null) {

            const ratingMap = new Map();

            summaries.forEach(summary => {

                ratingMap.set(
                    summary.cakeId,
                    summary
                );

            });


            cakes = cakes.map(cake => {

                const rating =
                    ratingMap.get(cake.id);


                return {
                    ...cake,

                    averageRating:
                        rating?.averageRating ?? null,

                    ratingCount:
                        rating?.ratingCount ?? 0
                };

            });

        } else {

            // Rating service unavailable

            cakes = cakes.map(cake => ({
                ...cake,

                averageRating: null,

                ratingCount: null
            }));

        }
    }


    const totalPages =
        Math.ceil(
            result.total / Number(size)
        );


    return {

        content: cakes,

        page: Number(page),

        size: Number(size),

        totalElements: result.total,

        totalPages,

        first: Number(page) === 0,

        last:
            totalPages === 0 ||
            Number(page) >= totalPages - 1
    };
};


const getCakeById = async (cakeId) => {

    return await cakeRepository.getCakeById(cakeId);
};


const getCakesByIds = async (ids) => {

    return await cakeRepository.getCakesByIds(ids);
};


const getCategories = async () => {

    const rows = await cakeRepository.getCategories();

    const labels = {
        CHOCOLATE: "Chocolate",
        BIRTHDAY: "Birthday",
        WEDDING: "Wedding",
        CHEESECAKE: "Cheesecake",
        CUPCAKE: "Cupcake",
        FRUIT: "Fruit",
        VEGAN: "Vegan",
        SUGAR_FREE: "Sugar Free",
        PASTRY: "Pastry"
    };

    return rows.map(row => ({
        value: row.category,
        label: labels[row.category] || row.category
    }));
};


const createCake = async (cake) => {

    return await cakeRepository.createCake(cake);
};


const updateCake = async (cakeId, fields) => {

    return await cakeRepository.updateCake(
        cakeId,
        fields
    );
};


const deleteCake = async (cakeId) => {

    return await cakeRepository.deleteCake(cakeId);
};


module.exports = {
    getCakes,
    getCakeById,
    getCakesByIds,
    getCategories,
    createCake,
    updateCake,
    deleteCake
};