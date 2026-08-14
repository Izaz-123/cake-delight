# API documentation

Every endpoint is reached through the API Gateway at
`http://localhost:8080/api/v1`.

Swagger UI is available at:

`http://localhost:8080/api-docs`

## Conventions

**Customer identity.** Basket, order, notification and rating-submission calls
require an `X-Customer-Id` header. The frontend sends it automatically.

**Correlation.** The gateway attaches an `X-Correlation-Id` to every request
(generating one if absent) and returns it on the response. It is written into
the `order.completed` event, so a checkout can be followed from the browser
through to the notification record.

**Errors.** Every service returns the same error shape:

```json
{
  "timestamp": "2026-08-13T03:45:29.493Z",
  "status": 403,
  "error": "FORBIDDEN",
  "message": "This cake was not purchased in the selected order",
  "path": "/api/v1/ratings",
  "correlationId": "c840aec3-81e3-48f6-9d22-03c71cf41ec7"
}
```

**Paging.** List endpoints return
`{ content, page, size, totalElements, totalPages, first, last }`.

---

## Health

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/health` | Gateway liveness |
| GET | `/health/services` | Fans out to all six services; 200 when every one is `UP`, 503 otherwise |

Each service also exposes its own `/health`, which is what the Kubernetes
probes and the Compose healthchecks use.

---

## Catalog — `/api/v1/cakes`

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/cakes` | List cakes, with filters and paging |
| GET | `/cakes/categories` | Distinct categories with display labels |
| GET | `/cakes/batch?ids=a,b,c` | Bulk lookup (used by the Order Service at checkout) |
| GET | `/cakes/{cakeId}` | Single cake |
| POST | `/cakes` | Create (admin) |
| PUT | `/cakes/{cakeId}` | Update (admin) |
| DELETE | `/cakes/{cakeId}` | Delete (admin) |

**Query parameters for `GET /cakes`**

| Parameter | Default | Notes |
| :--- | :--- | :--- |
| `name` | — | Partial match |
| `category` | — | Exact match |
| `minPrice` / `maxPrice` | — | `minPrice` must be ≤ `maxPrice` |
| `search` | — | Matches name or description |
| `available` | — | `true` / `false` |
| `page` | `0` | ≥ 0 |
| `size` | `12` | 1–100 |
| `sortBy` | `name` | `name`, `price`, `category`, `createdAt` |
| `sortDir` | `asc` | `asc` / `desc` |
| `includeRatings` | `true` | `false` skips the Rating Service call |

```bash
curl "http://localhost:8080/api/v1/cakes?category=CHOCOLATE&minPrice=30&maxPrice=40"
```

Each cake carries `averageRating` and `ratingCount`, merged in from the Rating
Service. When that service is unavailable both come back `null` and the
listing still succeeds.

---

## Basket — `/api/v1/basket`

Requires `X-Customer-Id`. Every call returns the recalculated basket.

| Method | Path | Body | Description |
| :--- | :--- | :--- | :--- |
| GET | `/basket` | — | Current basket and totals |
| POST | `/basket/items` | `{ cakeId, quantity }` | Add (or increase); quantity 1–50 |
| PUT | `/basket/items/{cakeId}` | `{ quantity }` | Set quantity; 1–50 |
| DELETE | `/basket/items/{cakeId}` | — | Remove one item |
| DELETE | `/basket` | — | Empty the basket |

```bash
curl -X POST http://localhost:8080/api/v1/basket/items \
  -H "Content-Type: application/json" \
  -H "X-Customer-Id: customer-1001" \
  -d '{"cakeId":"11111111-1111-4111-8111-111111111111","quantity":2}'
```

Totals: delivery is free above `FREE_DELIVERY_THRESHOLD` (999.00), otherwise
`DELIVERY_FEE` (99.00). Tax is `TAX_RATE` (5%) of the subtotal.

Adding an unavailable cake, or more than the catalogue stock, returns 400.

---

## Orders — `/api/v1/orders`

Requires `X-Customer-Id`.

| Method | Path | Description |
| :--- | :--- | :--- |
| POST | `/orders/checkout` | Re-price, create the order, clear the basket, write the outbox event |
| GET | `/orders` | Order history (`page`, `size`, `status`) |
| GET | `/orders/{orderId}` | One order with its items |
| GET | `/orders/by-number/{orderNumber}` | Look up by order number |
| PATCH | `/orders/{orderId}/status` | Advance the status |
| POST | `/orders/{orderId}/cancel` | Cancel while `PENDING` or `CONFIRMED` |

**Checkout body**

| Field | Required | Rule |
| :--- | :--- | :--- |
| `customerName` | yes | ≤ 160 characters |
| `customerEmail` | yes | Must be a valid address |
| `customerPhone` | no | 7–20 digits; **required if `SMS` is requested** |
| `deliveryAddress` | yes | |
| `deliveryNotes` | no | |
| `notificationChannels` | no | Defaults to `["EMAIL"]`; any of `EMAIL`, `SMS`, `IN_APP` |

```bash
curl -X POST http://localhost:8080/api/v1/orders/checkout \
  -H "Content-Type: application/json" \
  -H "X-Customer-Id: customer-1001" \
  -d '{"customerName":"Izaz Ahmed","customerEmail":"izaz@example.com",
       "deliveryAddress":"221B Baker Street","notificationChannels":["EMAIL","IN_APP"]}'
```

Checkout returns **409** if a cake was removed, became unavailable, or ran out
of stock since it entered the basket, and **400** if the basket is empty.
Prices always come from the catalogue at checkout time, never from the basket
snapshot.

**Status transitions**

```
PENDING ──> CONFIRMED ──> PREPARING ──> OUT_FOR_DELIVERY ──> DELIVERED
   │            │
   └────────────┴──> CANCELLED
```

Any other transition returns 409.

---

## Ratings — `/api/v1/ratings`

| Method | Path | Description |
| :--- | :--- | :--- |
| POST | `/ratings` | Submit or update a rating (needs `X-Customer-Id`) |
| GET | `/ratings/summary?cakeIds=a,b` | Bulk averages (used by the Catalog Service) |
| GET | `/ratings/cake/{cakeId}` | Reviews for a cake, paged |
| GET | `/ratings/cake/{cakeId}/summary` | Average plus the 1–5 star distribution |
| GET | `/ratings/customer/{customerId}` | Reviews by a customer, paged |
| GET | `/ratings/{ratingId}` | One rating |
| DELETE | `/ratings/{ratingId}` | Delete a rating |

**Submit body:** `{ cakeId, orderId, stars, review }` — `stars` is an integer
1–5, `review` ≤ 1000 characters, `orderId` is required.

Before storing, the Rating Service calls the Order Service to confirm the
customer owns that order and that the cake was on it:

- unknown order for this customer → **404**
- cake not in that order → **403**

Re-submitting for the same cake updates the existing rating.

---

## Notifications — `/api/v1/notifications`

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/notifications` | History for the caller (needs `X-Customer-Id`) |
| GET | `/notifications/customer/{customerId}` | History for a specific customer |

Records are created asynchronously after the `order.completed` event is
consumed, one per requested channel, each with a delivery `status`.

---

## Inventory — `/api/v1/inventory`

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/inventory/{cakeId}` | Stock, reserved and available quantities |

Reservations are made only from the order event; there is no write API.

---

## Analytics — `/api/v1/analytics`

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/analytics/summary` | Total orders, revenue and items |
| GET | `/analytics/top-cakes?limit=10` | Best sellers by quantity (`limit` 1–100) |
| GET | `/analytics/daily-revenue` | Orders and revenue per day |

Cancelled orders are excluded from every aggregate.
