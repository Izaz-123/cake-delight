const pool = require("../config/db");


// ============================================================
// GET OR CREATE BASKET
// ============================================================

const getOrCreateBasket = async (customerId) => {

    const [existing] = await pool.query(
        `
        SELECT customer_id
        FROM baskets
        WHERE customer_id = ?
        `,
        [customerId]
    );


    if (existing.length > 0) {

        // We don't have a separate basket ID.
        // customer_id acts as the basket identifier.
        return existing[0].customer_id;
    }


    await pool.query(
        `
        INSERT INTO baskets
        (
            customer_id
        )
        VALUES (?)
        `,
        [customerId]
    );


    return customerId;
};


// ============================================================
// GET BASKET ITEMS
// ============================================================

const getBasketItems = async (basketId) => {

    // basketId is actually customerId
    const [rows] = await pool.query(
        `
        SELECT
            id,
            cake_id AS cakeId,
            cake_name AS cakeName,
            image_url AS imageUrl,
            unit_price AS unitPrice,
            quantity,
            created_at AS addedAt
        FROM basket_items
        WHERE customer_id = ?
        ORDER BY created_at ASC
        `,
        [basketId]
    );


    return rows;
};


// ============================================================
// FIND BASKET ITEM
// ============================================================

const findBasketItem = async (
    basketId,
    cakeId
) => {

    const [rows] = await pool.query(
        `
        SELECT
            id,
            cake_id AS cakeId,
            quantity
        FROM basket_items
        WHERE customer_id = ?
        AND cake_id = ?
        `,
        [
            basketId,
            cakeId
        ]
    );


    return rows[0];
};


// ============================================================
// CREATE BASKET ITEM
// ============================================================

const createBasketItem = async (
    basketId,
    item
) => {

    const { v4: uuidv4 } = require("uuid");

    const id = uuidv4();


    await pool.query(
        `
        INSERT INTO basket_items
        (
            id,
            customer_id,
            cake_id,
            cake_name,
            unit_price,
            quantity,
            image_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id,
            basketId,
            item.cakeId,
            item.cakeName,
            item.unitPrice,
            item.quantity,
            item.imageUrl
        ]
    );


    return id;
};


// ============================================================
// UPDATE BASKET ITEM QUANTITY
// ============================================================

const updateBasketItemQuantity = async (
    basketId,
    cakeId,
    quantity
) => {

    await pool.query(
        `
        UPDATE basket_items
        SET quantity = ?
        WHERE customer_id = ?
        AND cake_id = ?
        `,
        [
            quantity,
            basketId,
            cakeId
        ]
    );
};


// ============================================================
// DELETE BASKET ITEM
// ============================================================

const deleteBasketItem = async (
    basketId,
    cakeId
) => {

    const [result] = await pool.query(
        `
        DELETE FROM basket_items
        WHERE customer_id = ?
        AND cake_id = ?
        `,
        [
            basketId,
            cakeId
        ]
    );


    return result.affectedRows > 0;
};


// ============================================================
// CLEAR BASKET
// ============================================================

const clearBasket = async (
    basketId
) => {

    await pool.query(
        `
        DELETE FROM basket_items
        WHERE customer_id = ?
        `,
        [basketId]
    );
};


module.exports = {

    getOrCreateBasket,

    getBasketItems,

    findBasketItem,

    createBasketItem,

    updateBasketItemQuantity,

    deleteBasketItem,

    clearBasket

};