USE cake_orders;

CREATE TABLE IF NOT EXISTS baskets (
    customer_id VARCHAR(80) PRIMARY KEY,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS basket_items (
    id CHAR(36) PRIMARY KEY,

    customer_id VARCHAR(80) NOT NULL,

    cake_id CHAR(36) NOT NULL,

    cake_name VARCHAR(160) NOT NULL,

    unit_price DECIMAL(10,2) NOT NULL,

    quantity INT NOT NULL,

    image_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_customer_cake (
        customer_id,
        cake_id
    ),

    CONSTRAINT chk_basket_quantity
        CHECK (quantity > 0)
);


CREATE TABLE IF NOT EXISTS orders (
    id CHAR(36) PRIMARY KEY,

    order_number VARCHAR(30) NOT NULL UNIQUE,

    customer_id VARCHAR(80) NOT NULL,

    customer_name VARCHAR(160) NOT NULL,

    customer_email VARCHAR(255) NOT NULL,

    customer_phone VARCHAR(50),

    delivery_address TEXT NOT NULL,

    delivery_notes TEXT,

    notification_channels JSON,

    status VARCHAR(30) NOT NULL,

    subtotal DECIMAL(10,2) NOT NULL,

    delivery_fee DECIMAL(10,2) NOT NULL,

    tax DECIMAL(10,2) NOT NULL,

    total DECIMAL(10,2) NOT NULL,

    currency CHAR(3) NOT NULL DEFAULT 'INR',

    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


CREATE INDEX idx_orders_customer
ON orders(customer_id);

CREATE INDEX idx_orders_status
ON orders(status);

CREATE INDEX idx_orders_placed_at
ON orders(placed_at);


CREATE TABLE IF NOT EXISTS order_items (
    id CHAR(36) PRIMARY KEY,

    order_id CHAR(36) NOT NULL,

    cake_id CHAR(36) NOT NULL,

    cake_name VARCHAR(160) NOT NULL,

    image_url VARCHAR(500),

    unit_price DECIMAL(10,2) NOT NULL,

    quantity INT NOT NULL,

    line_total DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
);


CREATE INDEX idx_order_items_order
ON order_items(order_id);


CREATE TABLE IF NOT EXISTS outbox_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    event_id CHAR(36) NOT NULL UNIQUE,

    event_type VARCHAR(100) NOT NULL,

    aggregate_id CHAR(36) NOT NULL,

    payload JSON NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    attempts INT NOT NULL DEFAULT 0,

    last_error TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    published_at TIMESTAMP NULL
);


CREATE INDEX idx_outbox_status_created
ON outbox_events(status, created_at);