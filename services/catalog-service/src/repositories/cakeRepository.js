const pool = require("../config/db");

const getCakes = async ({
    name,
    category,
    minPrice,
    maxPrice,
    available,
    search,
    page,
    size,
    sortBy,
    sortDir
}) => {

    let whereConditions = [];
    let values = [];

    if (name) {
        whereConditions.push("name LIKE ?");
        values.push(`%${name}%`);
    }

    if (category) {
        whereConditions.push("category = ?");
        values.push(category);
    }

    if (minPrice !== undefined && minPrice !== "") {
        whereConditions.push("price >= ?");
        values.push(Number(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== "") {
        whereConditions.push("price <= ?");
        values.push(Number(maxPrice));
    }

    if (available !== undefined) {
        whereConditions.push("available = ?");
        values.push(available);
    }

    if (search) {
        whereConditions.push(
            "(name LIKE ? OR description LIKE ?)"
        );

        values.push(`%${search}%`);
        values.push(`%${search}%`);
    }

    let whereClause = "";

    if (whereConditions.length > 0) {
        whereClause = "WHERE " + whereConditions.join(" AND ");
    }

    // Whitelist of sortable fields mapped to their real column names.
    // Values never reach the query directly, so ORDER BY stays injection safe.
    const allowedSortColumns = {
        name: "name",
        price: "price",
        category: "category",
        createdAt: "created_at"
    };

    const sortColumn =
        allowedSortColumns[sortBy] || "name";

    const direction = sortDir === "desc"
        ? "DESC"
        : "ASC";

    const offset = page * size;

    const dataQuery = `
        SELECT
            id,
            name,
            description,
            category,
            price,
            currency,
            available,
            stock_quantity AS stockQuantity,
            image_url AS imageUrl,
            created_at AS createdAt,
            updated_at AS updatedAt
        FROM cakes
        ${whereClause}
        ORDER BY ${sortColumn} ${direction}
        LIMIT ? OFFSET ?
    `;

    const countQuery = `
        SELECT COUNT(*) AS total
        FROM cakes
        ${whereClause}
    `;

    const [rows] = await pool.query(
        dataQuery,
        [...values, size, offset]
    );

    const [countRows] = await pool.query(
        countQuery,
        values
    );

    return {
        rows,
        total: countRows[0].total
    };
};


const getCakeById = async (cakeId) => {

    const [rows] = await pool.query(
        `
        SELECT
            id,
            name,
            description,
            category,
            price,
            currency,
            available,
            stock_quantity AS stockQuantity,
            image_url AS imageUrl,
            created_at AS createdAt,
            updated_at AS updatedAt
        FROM cakes
        WHERE id = ?
        `,
        [cakeId]
    );

    return rows[0];
};


const getCakesByIds = async (ids) => {

    if (!ids || ids.length === 0) {
        return [];
    }

    const placeholders = ids.map(() => "?").join(",");

    const [rows] = await pool.query(
        `
        SELECT
            id,
            name,
            description,
            category,
            price,
            currency,
            available,
            stock_quantity AS stockQuantity,
            image_url AS imageUrl,
            created_at AS createdAt,
            updated_at AS updatedAt
        FROM cakes
        WHERE id IN (${placeholders})
        `,
        ids
    );

    return rows;
};


const getCategories = async () => {

    const [rows] = await pool.query(
        `
        SELECT DISTINCT category
        FROM cakes
        ORDER BY category
        `
    );

    return rows;
};


const createCake = async (cake) => {

    const {
        id,
        name,
        description,
        category,
        price,
        currency,
        available,
        stockQuantity,
        imageUrl
    } = cake;

    await pool.query(
        `
        INSERT INTO cakes
        (
            id,
            name,
            description,
            category,
            price,
            currency,
            available,
            stock_quantity,
            image_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            name,
            description,
            category,
            price,
            currency,
            available,
            stockQuantity,
            imageUrl
        ]
    );

    return await getCakeById(id);
};


const updateCake = async (cakeId, fields) => {

    const allowedFields = {
        name: "name",
        description: "description",
        category: "category",
        price: "price",
        currency: "currency",
        available: "available",
        stockQuantity: "stock_quantity",
        imageUrl: "image_url"
    };

    const updates = [];
    const values = [];

    for (const key of Object.keys(fields)) {

        if (
            fields[key] !== undefined &&
            allowedFields[key]
        ) {
            updates.push(
                `${allowedFields[key]} = ?`
            );

            values.push(fields[key]);
        }
    }

    if (updates.length === 0) {
        return await getCakeById(cakeId);
    }

    values.push(cakeId);

    await pool.query(
        `
        UPDATE cakes
        SET ${updates.join(", ")}
        WHERE id = ?
        `,
        values
    );

    return await getCakeById(cakeId);
};


const deleteCake = async (cakeId) => {

    const [result] = await pool.query(
        `
        DELETE FROM cakes
        WHERE id = ?
        `,
        [cakeId]
    );

    return result.affectedRows > 0;
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