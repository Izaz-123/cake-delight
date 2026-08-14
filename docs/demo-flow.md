# End-to-end demonstration

Start the stack, then walk this script. Roughly five minutes.

```bash
docker compose up -d --build
```

Wait until every container reports healthy:

```bash
docker compose ps
curl http://localhost:8080/health/services
```

Open <http://localhost:8080>.

---

## 1. Browse the catalogue

Go to **Cakes**. Six cakes load from the Catalog Service through the gateway.
The star badge on each card is the average rating, merged in from a separate
call the Catalog Service makes to the Rating Service.

## 2. Filter

The category dropdown is populated from `GET /api/v1/cakes/categories`, so it
always matches the data. Try:

- Category **Chocolate** → 2 cakes
- Min price `30`, max price `40` → the cakes in that band
- Search `velvet` → Red Velvet Dream

Then press **Reset**.

## 3. Basket

Add two or three cakes. On **Basket** you can change a quantity, remove a
line, or clear the basket; each action recalculates subtotal, delivery fee
(free above $75), tax and total server-side.

> Try setting a quantity above the catalogue stock — the Order Service checks
> live stock and returns a clear 400.

## 4. Checkout

Press **Proceed to Checkout**, fill in name, email, address, and pick your
notification channels (SMS needs a phone number). Press **Place Order**.

Behind that one request the Order Service:

1. re-prices every basket line against the Catalog Service,
2. creates the order and its items,
3. clears the basket,
4. writes the `order.completed` event to its outbox,

all in a single database transaction. You land on **Orders** with the new
order in `CONFIRMED`.

## 5. The event

Within about five seconds the outbox publisher sends the event to RabbitMQ.
Watch it land:

```bash
docker compose logs -f notification-service inventory-service analytics-service
```

Open the broker UI at <http://localhost:15672> (`guest` / `guest`) to see the
`order.events` exchange fanning out to the three queues.

## 6. Notification

Open **Notifications**. One record per channel you selected, each written by
the Notification Service after it consumed the event. Nothing in the checkout
request path produced these.

## 7. Rating

Open **Ratings**. The dropdown lists only cakes from your own orders. Pick
one, choose a star rating, write a review and submit.

The Rating Service calls the Order Service to confirm you actually bought that
cake on that order before it stores anything. Go back to **Cakes** and the
badge on that cake now shows your rating.

## 8. Event-driven side effects

```bash
# Stock reserved by the Inventory Service from the same event
curl http://localhost:8080/api/v1/inventory/11111111-1111-4111-8111-111111111111

# Metrics built by the Analytics Service from the same event
curl http://localhost:8080/api/v1/analytics/summary
curl http://localhost:8080/api/v1/analytics/top-cakes
```

Three services reacted to one event, and none of them was called by the
checkout request.

---

## Independent scalability and resilience

**Scale one service on its own:**

```bash
docker compose up -d --scale catalog-service=3
```

**Show graceful degradation** — stop the Rating Service and reload **Cakes**.
The catalogue still lists everything, just without star ratings:

```bash
docker compose stop rating-service
curl http://localhost:8080/health/services   # DEGRADED, rating DOWN
docker compose start rating-service
```

**Show the outbox surviving a broker outage** — stop RabbitMQ, place an order
(checkout still succeeds), then start the broker and watch the event go out:

```bash
docker compose stop rabbitmq
# place an order in the UI
docker compose exec order-db mysql -uroot -pRoot@123 -D cake_orders \
  -e "SELECT event_id, status, attempts FROM outbox_events;"
docker compose start rabbitmq
# a few seconds later the row flips to PUBLISHED and the notification appears
```

---

## One-command verification

```bash
bash scripts/smoke-test.sh
```

Runs the whole journey — browse, filter, basket, checkout, event, notification,
rating, plus the purchase-verification rejection — and fails loudly on the
first broken step.

---

For the request/response detail see
[api-documentation.md](api-documentation.md); for the asynchronous payload see
[event-contract.md](event-contract.md).
