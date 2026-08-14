#!/usr/bin/env bash
# ============================================================
# Cake Delight - end to end smoke test
# ============================================================
#
#   ./scripts/smoke-test.sh [base-url]
#
# Walks the full customer journey through the API Gateway:
#   browse -> filter -> basket -> checkout -> event -> notification -> rating
#
# Exits non-zero on the first failed step.
# ============================================================

set -euo pipefail

BASE="${1:-http://localhost:8080}"
CUSTOMER="smoke-$(date +%s)"

pass() { echo "  PASS  $1"; }
fail() { echo "  FAIL  $1"; exit 1; }

json() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);console.log($1)})"; }


echo "== 1. Gateway health =="
curl -sf "$BASE/health" > /dev/null && pass "gateway is up" || fail "gateway is down"
curl -sf "$BASE/health/services" > /dev/null && pass "all services are up" || fail "a service is down"


echo "== 2. Browse the catalogue =="
CAKE_ID=$(curl -sf "$BASE/api/v1/cakes?size=1" | json "o.content[0].id")
[ -n "$CAKE_ID" ] && pass "listed cakes (first: $CAKE_ID)" || fail "no cakes returned"

curl -sf "$BASE/api/v1/cakes/categories" > /dev/null && pass "listed categories" || fail "categories failed"


echo "== 3. Filter =="
COUNT=$(curl -sf "$BASE/api/v1/cakes?category=CHOCOLATE&minPrice=1&maxPrice=1000" | json "o.totalElements")
[ "$COUNT" -gt 0 ] && pass "category + price filter returned $COUNT" || fail "filter returned nothing"


echo "== 4. Basket =="
curl -sf -X POST "$BASE/api/v1/basket/items" \
    -H "Content-Type: application/json" -H "X-Customer-Id: $CUSTOMER" \
    -d "{\"cakeId\":\"$CAKE_ID\",\"quantity\":2}" > /dev/null && pass "added item" || fail "add failed"

TOTAL=$(curl -sf "$BASE/api/v1/basket" -H "X-Customer-Id: $CUSTOMER" | json "o.total")
[ -n "$TOTAL" ] && pass "basket total is $TOTAL" || fail "basket read failed"

curl -sf -X PUT "$BASE/api/v1/basket/items/$CAKE_ID" \
    -H "Content-Type: application/json" -H "X-Customer-Id: $CUSTOMER" \
    -d '{"quantity":1}' > /dev/null && pass "updated quantity" || fail "update failed"


echo "== 5. Checkout =="
ORDER=$(curl -sf -X POST "$BASE/api/v1/orders/checkout" \
    -H "Content-Type: application/json" -H "X-Customer-Id: $CUSTOMER" \
    -d '{"customerName":"Smoke Test","customerEmail":"smoke@example.com",
         "deliveryAddress":"1 Test Street","notificationChannels":["EMAIL","IN_APP"]}')

ORDER_ID=$(echo "$ORDER" | json "o.id")
ORDER_NUMBER=$(echo "$ORDER" | json "o.orderNumber")
[ -n "$ORDER_ID" ] && pass "created order $ORDER_NUMBER" || fail "checkout failed"

ITEMS=$(curl -sf "$BASE/api/v1/basket" -H "X-Customer-Id: $CUSTOMER" | json "o.items.length")
[ "$ITEMS" = "0" ] && pass "basket cleared" || fail "basket not cleared"


echo "== 6. Notification (asynchronous) =="
for attempt in $(seq 1 20); do
    COUNT=$(curl -sf "$BASE/api/v1/notifications" -H "X-Customer-Id: $CUSTOMER" | json "o.length")
    [ "$COUNT" -gt 0 ] && break
    sleep 2
done
[ "${COUNT:-0}" -gt 0 ] && pass "received $COUNT notification(s) from the order event" \
    || fail "no notification arrived within 40s"


echo "== 7. Rating =="
curl -sf -X POST "$BASE/api/v1/ratings" \
    -H "Content-Type: application/json" -H "X-Customer-Id: $CUSTOMER" \
    -d "{\"cakeId\":\"$CAKE_ID\",\"orderId\":\"$ORDER_ID\",\"stars\":5,\"review\":\"Smoke test\"}" \
    > /dev/null && pass "submitted rating" || fail "rating failed"

AVG=$(curl -sf "$BASE/api/v1/ratings/cake/$CAKE_ID/summary" | json "o.averageRating")
[ -n "$AVG" ] && pass "average rating is $AVG" || fail "summary failed"


echo "== 8. Purchase verification (must be rejected) =="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/ratings" \
    -H "Content-Type: application/json" -H "X-Customer-Id: unknown-customer" \
    -d "{\"cakeId\":\"$CAKE_ID\",\"orderId\":\"$ORDER_ID\",\"stars\":5}")
[ "$STATUS" = "404" ] || [ "$STATUS" = "403" ] && pass "unpurchased rating rejected ($STATUS)" \
    || fail "expected 403/404, got $STATUS"


echo
echo "All checks passed."
