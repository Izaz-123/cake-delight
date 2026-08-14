USE cake_analytics;

CREATE TABLE IF NOT EXISTS order_analytics (
    id CHAR(36) PRIMARY KEY,

    event_id CHAR(36) NOT NULL UNIQUE,

    order_id CHAR(36) NOT NULL UNIQUE,

    order_number VARCHAR(30) NOT NULL,

    customer_id VARCHAR(80) NOT NULL,

    status VARCHAR(30) NOT NULL,

    subtotal DECIMAL(10,2) NOT NULL,

    delivery_fee DECIMAL(10,2) NOT NULL,

    tax DECIMAL(10,2) NOT NULL,

    total DECIMAL(10,2) NOT NULL,

    currency CHAR(3) NOT NULL,

    item_count INT NOT NULL,

    placed_at DATETIME NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS order_item_analytics (
    id CHAR(36) PRIMARY KEY,

    order_id CHAR(36) NOT NULL,

    cake_id CHAR(36) NOT NULL,

    cake_name VARCHAR(160) NOT NULL,

    quantity INT NOT NULL,

    unit_price DECIMAL(10,2) NOT NULL,

    line_total DECIMAL(10,2) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_order_analytics_date
ON order_analytics(placed_at);

CREATE INDEX idx_item_analytics_cake
ON order_item_analytics(cake_id);