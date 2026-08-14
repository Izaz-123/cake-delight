# `order.completed` event contract

## Publication

The Order Service writes the event into its transactional outbox in the same
database transaction that creates the order. A background publisher then sends
pending rows to RabbitMQ **on a confirm channel**, and only marks a row
`PUBLISHED` once the broker acknowledges it.

If the broker is unavailable the checkout still succeeds and the event is sent
on a later poll. A row that cannot be published after 10 attempts is marked
`FAILED` with the last error, so it can be inspected rather than blocking the
queue.

| Setting | Value |
| :--- | :--- |
| Exchange | `order.events` (topic, durable) |
| Routing key | `order.completed` |
| Dead letter exchange | `order.dlx` (topic, durable) |
| Delivery mode | Persistent |
| `messageId` | The `eventId`, which is also the consumers' idempotency key |
| `type` | `order.completed` |
| `contentType` | `application/json` |
| Header `eventVersion` | `1` |
| Poll interval | 5s (`OUTBOX_POLL_INTERVAL_MS`) |

## Queue ownership

The Order Service declares the **exchanges only**. Each consumer declares and
binds its own queue and dead letter queue. If two services declared the same
queue with different dead letter arguments, RabbitMQ would close the channel
with `PRECONDITION_FAILED`.

| Consumer | Queue | Dead letter queue |
| :--- | :--- | :--- |
| Notification | `notification.order.completed` | `notification.order.completed.dlq` |
| Inventory | `inventory.order.completed` | `inventory.order.completed.dlq` |
| Analytics | `analytics.order.completed` | `analytics.order.completed.dlq` |

Each main queue is declared with
`x-dead-letter-exchange: order.dlx` and
`x-dead-letter-routing-key: <its dlq>`, and each dead letter queue is bound to
`order.dlx` with its own name as the routing key.

Consumers use `prefetch(1)`, retry a failing handler three times with backoff,
and only then `nack(requeue: false)` so the message is dead lettered instead
of looping.

## Payload

```json
{
  "eventId": "9e421756-b2c7-4cb7-a375-9a6def49dc2b",
  "eventType": "order.completed",
  "eventVersion": 1,
  "occurredAt": "2026-08-13T03:44:00.000Z",
  "correlationId": "fc8007e9-a1ff-4caa-93d3-a952da74fe2f",
  "order": {
    "orderId": "eae22a05-bcc1-45a7-bd09-9f76b7fb3952",
    "orderNumber": "CD-20260813-UTHQ",
    "status": "CONFIRMED",
    "placedAt": "2026-08-13T03:44:00.000Z",
    "customer": {
      "customerId": "customer-1001",
      "name": "Izaz Ahmed",
      "email": "izaz@example.com",
      "phone": "+919999999999",
      "notificationChannels": ["EMAIL", "SMS", "IN_APP"]
    },
    "items": [
      {
        "cakeId": "11111111-1111-4111-8111-111111111111",
        "cakeName": "Belgian Chocolate Truffle",
        "quantity": 2,
        "unitPrice": 34.5,
        "lineTotal": 69.0
      }
    ],
    "totals": {
      "subtotal": 69.0,
      "deliveryFee": 5.99,
      "tax": 3.45,
      "total": 78.44,
      "currency": "USD",
      "itemCount": 2
    },
    "deliveryAddress": "12 Baker Street, Sweet City",
    "deliveryNotes": "Ring the bell"
  }
}
```

### Fields

| Field | Type | Notes |
| :--- | :--- | :--- |
| `eventId` | uuid | Unique per event. Consumers use it for idempotency. |
| `eventType` | string | Always `order.completed`. Consumers reject anything else. |
| `eventVersion` | integer | `1`. Bump for a breaking payload change. |
| `occurredAt` | ISO 8601 | When the order was placed. |
| `correlationId` | uuid, nullable | Propagated from the originating HTTP request. |
| `order.customer.phone` | string | Omitted when not supplied. |
| `order.customer.notificationChannels` | array | Any of `EMAIL`, `SMS`, `IN_APP`. |
| `order.items[].unitPrice` | number | The price at checkout, not the basket price. |
| `order.deliveryNotes` | string | Omitted when not supplied. |

## Consumer behaviour

| Consumer | Action | Idempotency key |
| :--- | :--- | :--- |
| **Notification** | One notification per requested channel, then marks it `SENT` or `FAILED` | `UNIQUE (event_id, channel)` |
| **Inventory** | Reserves stock per item inside one transaction with `SELECT ... FOR UPDATE` | `UNIQUE (event_id)` on `stock_reservations` |
| **Analytics** | Writes one order row and one row per item | `UNIQUE (event_id)` on `order_analytics` |

Redelivery is therefore safe: a second copy of the same event produces no
duplicate notification, reservation or metric.

## Compatibility

Consumers ignore unknown fields, so additive changes need no coordination.
A breaking change means a new `eventVersion` and, if consumers must run in
parallel, a new routing key such as `order.completed.v2`.
