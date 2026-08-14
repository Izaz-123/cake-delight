USE cake_catalog;

CREATE TABLE IF NOT EXISTS cakes (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    category VARCHAR(80) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    image_url VARCHAR(500),
    stock_quantity INT NOT NULL DEFAULT 0,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_cakes_category
ON cakes(category);

CREATE INDEX idx_cakes_available
ON cakes(available);

CREATE INDEX idx_cakes_price
ON cakes(price);


-- ============================================================
-- SEED DATA
-- ============================================================
--
-- The catalogue uses fixed identifiers instead of UUID() so the
-- Inventory Service can be seeded with matching stock rows and so
-- the documented sample requests keep working after a rebuild.
--
-- Image references are served by the API Gateway from /images.
-- ============================================================

INSERT INTO cakes
(
    id,
    name,
    description,
    category,
    price,
    currency,
    image_url,
    stock_quantity,
    available
)
VALUES
(
    '11111111-1111-4111-8111-111111111111',
    'Belgian Chocolate Truffle',
    'Rich chocolate sponge layered with Belgian chocolate ganache and truffle cream.',
    'CHOCOLATE',
    699.00,
    'INR',
    '/images/chocolate.png',
    24,
    TRUE
),
(
    '22222222-2222-4222-8222-222222222222',
    'Dark Chocolate Fudge',
    'Dense fudge cake finished with a glossy dark chocolate glaze.',
    'CHOCOLATE',
    599.00,
    'INR',
    '/images/chocolate.png',
    18,
    TRUE
),
(
    '33333333-3333-4333-8333-333333333333',
    'Strawberry Celebration',
    'Light vanilla sponge with fresh strawberries and whipped cream.',
    'FRUIT',
    649.00,
    'INR',
    '/images/strawberry.png',
    15,
    TRUE
),
(
    '44444444-4444-4444-8444-444444444444',
    'Mixed Berry Delight',
    'Summer berries folded through a soft cream cheese frosting.',
    'FRUIT',
    749.00,
    'INR',
    '/images/strawberry.png',
    12,
    TRUE
),
(
    '55555555-5555-4555-8555-555555555555',
    'Red Velvet Dream',
    'Classic red velvet with a smooth cream cheese frosting.',
    'BIRTHDAY',
    699.00,
    'INR',
    '/images/red-velvet.png',
    20,
    TRUE
),
(
    '66666666-6666-4666-8666-666666666666',
    'Vanilla Celebration Tier',
    'Two tier vanilla bean cake finished with buttercream roses.',
    'WEDDING',
    1999.00,
    'INR',
    '/images/red-velvet.png',
    6,
    TRUE
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    category = VALUES(category),
    price = VALUES(price),
    currency = VALUES(currency),
    image_url = VALUES(image_url),
    stock_quantity = VALUES(stock_quantity),
    available = VALUES(available);