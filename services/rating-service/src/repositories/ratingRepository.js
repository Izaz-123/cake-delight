const pool = require("../config/db");

// ============================================================
// CREATE OR UPDATE RATING
// ============================================================

const createOrUpdateRating = async (rating) => {
    const {
        id,
        cakeId,
        customerId,
        stars,
        review,
        orderId
    } = rating;

    const [existing] = await pool.query(
        `
        SELECT id
        FROM ratings
        WHERE customer_id = ?
          AND cake_id = ?
        `,
        [customerId, cakeId]
    );

    if (existing.length > 0) {
        await pool.query(
            `
            UPDATE ratings
            SET
                stars = ?,
                review = ?,
                order_id = ?
            WHERE id = ?
            `,
            [
                stars,
                review,
                orderId || null,
                existing[0].id
            ]
        );

        return getRatingById(existing[0].id);
    }

    await pool.query(
        `
        INSERT INTO ratings
        (
            id,
            cake_id,
            customer_id,
            stars,
            review,
            order_id
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            cakeId,
            customerId,
            stars,
            review || null,
            orderId || null
        ]
    );

    return getRatingById(id);
};


// ============================================================
// GET RATING BY ID
// ============================================================

const getRatingById = async (ratingId) => {

    const [rows] = await pool.query(
        `
        SELECT
            id,
            cake_id AS cakeId,
            customer_id AS customerId,
            stars,
            review,
            order_id AS orderId,
            created_at AS createdAt,
            updated_at AS updatedAt
        FROM ratings
        WHERE id = ?
        `,
        [ratingId]
    );

    return rows[0] || null;
};


// ============================================================
// GET RATINGS FOR A CAKE
// ============================================================

const getRatingsByCake = async (
    cakeId,
    page = 0,
    size = 20
) => {

    const offset = page * size;

    const [rows] = await pool.query(
        `
        SELECT
            id,
            cake_id AS cakeId,
            customer_id AS customerId,
            stars,
            review,
            order_id AS orderId,
            created_at AS createdAt,
            updated_at AS updatedAt
        FROM ratings
        WHERE cake_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        `,
        [cakeId, Number(size), Number(offset)]
    );

    const [countRows] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM ratings
        WHERE cake_id = ?
        `,
        [cakeId]
    );

    return {
        rows,
        total: Number(countRows[0].total)
    };
};


// ============================================================
// GET RATINGS BY CUSTOMER
// ============================================================

const getRatingsByCustomer = async (
    customerId,
    page = 0,
    size = 20
) => {

    const offset = page * size;

    const [rows] = await pool.query(
        `
        SELECT
            id,
            cake_id AS cakeId,
            customer_id AS customerId,
            stars,
            review,
            order_id AS orderId,
            created_at AS createdAt,
            updated_at AS updatedAt
        FROM ratings
        WHERE customer_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        `,
        [customerId, Number(size), Number(offset)]
    );

    const [countRows] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM ratings
        WHERE customer_id = ?
        `,
        [customerId]
    );

    return {
        rows,
        total: Number(countRows[0].total)
    };
};


// ============================================================
// GET CAKE SUMMARY
// ============================================================

const getCakeSummary = async (cakeId) => {

    const [rows] = await pool.query(
        `
        SELECT
            COUNT(*) AS ratingCount,
            AVG(stars) AS averageRating,

            SUM(
                CASE WHEN stars = 1
                THEN 1 ELSE 0 END
            ) AS oneStar,

            SUM(
                CASE WHEN stars = 2
                THEN 1 ELSE 0 END
            ) AS twoStar,

            SUM(
                CASE WHEN stars = 3
                THEN 1 ELSE 0 END
            ) AS threeStar,

            SUM(
                CASE WHEN stars = 4
                THEN 1 ELSE 0 END
            ) AS fourStar,

            SUM(
                CASE WHEN stars = 5
                THEN 1 ELSE 0 END
            ) AS fiveStar

        FROM ratings
        WHERE cake_id = ?
        `,
        [cakeId]
    );

    const result = rows[0];

    const ratingCount = Number(result.ratingCount);

    return {
        cakeId,

        averageRating:
            ratingCount > 0
                ? Number(
                    Number(result.averageRating).toFixed(1)
                )
                : undefined,

        ratingCount,

        distribution: {
            "1": Number(result.oneStar),
            "2": Number(result.twoStar),
            "3": Number(result.threeStar),
            "4": Number(result.fourStar),
            "5": Number(result.fiveStar)
        }
    };
};


// ============================================================
// GET BULK SUMMARIES
// ============================================================

const getBulkSummaries = async (cakeIds) => {

    if (!cakeIds || cakeIds.length === 0) {
        return [];
    }

    const placeholders = cakeIds
        .map(() => "?")
        .join(",");

    const [rows] = await pool.query(
        `
        SELECT
            cake_id AS cakeId,
            COUNT(*) AS ratingCount,
            AVG(stars) AS averageRating
        FROM ratings
        WHERE cake_id IN (${placeholders})
        GROUP BY cake_id
        `,
        cakeIds
    );

    const resultMap = new Map();

    rows.forEach(row => {

        resultMap.set(
            row.cakeId,
            {
                cakeId: row.cakeId,

                averageRating:
                    Number(
                        Number(row.averageRating).toFixed(1)
                    ),

                ratingCount:
                    Number(row.ratingCount)
            }
        );

    });

    return cakeIds.map(cakeId => {

        return resultMap.get(cakeId) || {
            cakeId,
            ratingCount: 0
        };

    });
};


// ============================================================
// DELETE RATING
// ============================================================

const deleteRating = async (ratingId) => {

    const [result] = await pool.query(
        `
        DELETE FROM ratings
        WHERE id = ?
        `,
        [ratingId]
    );

    return result.affectedRows > 0;
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    createOrUpdateRating,
    getRatingById,
    getRatingsByCake,
    getRatingsByCustomer,
    getCakeSummary,
    getBulkSummaries,
    deleteRating
};
