# Database design

Each service owns one MySQL 8.4 database. There are no foreign keys between
databases and no service reads another service's schema — an order item stores
the cake name and price it was bought at rather than pointing into the
catalogue.

The DDL for each database is in `database/*.sql`. Docker Compose mounts these
into `/docker-entrypoint-initdb.d`; Kubernetes mounts the same files through
the ConfigMaps in `kubernetes/database/`.

---

## catalog-db (`cake_catalog`)

### `cakes`

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | CHAR(36) | Primary key |
| `name` | VARCHAR(160) | Filterable with `LIKE` |
| `description` | TEXT | |
| `category` | VARCHAR(80) | Indexed |
| `price` | DECIMAL(10,2) | Indexed for range filters |
| `currency` | VARCHAR(3) | Defaults to `USD` |
| `image_url` | VARCHAR(500) | Served from `/images` by the gateway |
| `stock_quantity` | INT | Checked before an item enters the basket |
| `available` | BOOLEAN | Indexed |
| `created_at` / `updated_at` | TIMESTAMP | `updated_at` auto-updates |

Indexes: `idx_cakes_category`, `idx_cakes_available`, `idx_cakes_price`.

---

## rating-db (`cake_ratings`)

### `ratings`

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | CHAR(36) | Primary key |
| `cake_id` | CHAR(36) | Indexed; belongs to the Catalog Service |
| `customer_id` | VARCHAR(80) | Indexed |
| `stars` | INT | `CHECK (stars BETWEEN 1 AND 5)` |
| `review` | TEXT | Max 1000 characters, enforced by the API |
| `order_id` | CHAR(36) | The order the purchase was verified against |
| `created_at` / `updated_at` | TIMESTAMP | |

`UNIQUE (customer_id, cake_id)` gives one review per customer per cake — a
second submission updates the first instead of creating a duplicate.

---

## order-db (`cake_orders`)

### `baskets`
`customer_id` (PK), `updated_at`. The customer id doubles as the basket id.

### `basket_items`

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | CHAR(36) | Primary key |
| `customer_id` | VARCHAR(80) | |
| `cake_id`, `cake_name`, `unit_price`, `image_url` | | Snapshot for display |
| `quantity` | INT | `CHECK (quantity > 0)` |

`UNIQUE (customer_id, cake_id)` so adding the same cake twice increments the
quantity rather than creating a second row.

### `orders`
Customer contact details, delivery address and notes, `notification_channels`
(JSON), `status`, and the price breakdown (`subtotal`, `delivery_fee`, `tax`,
`total`, `currency`). `order_number` is unique. Indexed on `customer_id`,
`status` and `placed_at`.

### `order_items`
Immutable line items with `unit_price` and `line_total` captured at checkout,
`FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE`.

### `outbox_events`

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | BIGINT AUTO_INCREMENT | Primary key |
| `event_id` | CHAR(36) UNIQUE | Also the AMQP `messageId`, and the consumers' idempotency key |
| `event_type` | VARCHAR(100) | `order.completed` |
| `aggregate_id` | CHAR(36) | The order id |
| `payload` | JSON | The full event body |
| `status` | VARCHAR(30) | `PENDING` → `PUBLISHED`, or `FAILED` after 10 attempts |
| `attempts`, `last_error` | | Publisher retry bookkeeping |
| `created_at`, `published_at` | TIMESTAMP | |

Indexed on `(status, created_at)` — the exact shape the publisher polls.

---

## inventory-db (`cake_inventory`)

### `inventory`
`cake_id` (PK), `cake_name`, `stock_quantity`, `reserved_quantity`, both with
`CHECK (>= 0)`. Seeded to match the catalogue; a cake added later is
provisioned automatically the first time it appears on an order event.

### `stock_reservations`
`event_id` is **UNIQUE** — the idempotency key that makes a redelivered event
a no-op instead of a double reservation.

### `stock_reservation_items`
Per-cake quantities, cascading from the reservation.

---

## notification-db (`cake_notifications`)

### `notifications`

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | CHAR(36) | Primary key |
| `event_id` | CHAR(36) | Part of the idempotency key |
| `order_id`, `customer_id` | | Indexed |
| `channel` | VARCHAR(20) | `EMAIL`, `SMS` or `IN_APP` |
| `recipient`, `subject`, `message` | | The rendered notification |
| `status` | VARCHAR(30) | `PENDING` → `SENT` / `FAILED` |
| `error_message` | TEXT | Populated on failure |
| `created_at`, `sent_at` | TIMESTAMP | |

`UNIQUE (event_id, channel)` guarantees a redelivered event cannot send the
customer a second confirmation on the same channel.

---

## analytics-db (`cake_analytics`)

### `order_analytics`
One row per order with the price breakdown and `item_count`. Both `event_id`
and `order_id` are UNIQUE, making replay safe. Indexed on `placed_at` for the
daily revenue query.

### `order_item_analytics`
One row per line item, indexed on `cake_id` for the top-cakes query.

---

## Idempotency summary

Every consumer is at-least-once safe:

| Service | Key | Effect of redelivery |
| :--- | :--- | :--- |
| Notification | `UNIQUE (event_id, channel)` | Returns `duplicate: true`, sends nothing |
| Inventory | `UNIQUE (event_id)` | Returns the existing reservation |
| Analytics | `UNIQUE (event_id)` | Skips the insert |
