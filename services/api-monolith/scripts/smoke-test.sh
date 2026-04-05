#!/usr/bin/env bash
# =============================================================================
# Bazzar Monolith — End-to-End Smoke Test
# Traces the full cross-module flow:
#   1. Health checks   (DB + full system)
#   2. User auth       (register → login)
#   3. Fetch product   (browse catalogue)
#   4. Add to cart     (authenticated cart write)
#
# Usage:
#   chmod +x scripts/smoke-test.sh
#   ./scripts/smoke-test.sh [BASE_URL]
#
# Defaults to http://localhost:8100 if no argument given.
# =============================================================================

set -euo pipefail

BASE="${1:-http://localhost:8100}"
PASS=0
FAIL=0

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓ $*${NC}"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}  ✗ $*${NC}"; FAIL=$((FAIL+1)); }
info() { echo -e "${YELLOW}▶ $*${NC}"; }

# ── Helper: curl with JSON + timeout ──────────────────────────────────────────
api() {
  local method="$1" url="$2"
  shift 2
  curl -s -X "$method" "$url" \
       -H "Content-Type: application/json" \
       --max-time 10 \
       "$@"
}

# ─────────────────────────────────────────────────────────────────────────────
info "STEP 1 — Health checks"
# ─────────────────────────────────────────────────────────────────────────────

HEALTH=$(api GET "$BASE/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  ok "GET /health → $HEALTH"
else
  fail "GET /health failed: $HEALTH"
fi

DB_HEALTH=$(api GET "$BASE/health/db")
DB_STATE=$(echo "$DB_HEALTH" | grep -o '"readyState":[0-9]*' | head -1 | grep -o '[0-9]*')
if [ "${DB_STATE:-0}" = "1" ]; then
  PING_MS=$(echo "$DB_HEALTH" | grep -o '"pingMs":[0-9]*' | grep -o '[0-9]*$')
  ok "GET /health/db → connected (ping ${PING_MS}ms)"
else
  fail "GET /health/db → NOT connected. Full response: $DB_HEALTH"
fi

FULL=$(api GET "$BASE/health/full")
FULL_STATUS=$(echo "$FULL" | grep -o '"status":"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')
if [ "${FULL_STATUS:-}" = "ok" ]; then
  ok "GET /health/full → $FULL_STATUS"
else
  fail "GET /health/full → $FULL_STATUS | $FULL"
fi

# ─────────────────────────────────────────────────────────────────────────────
info "STEP 2 — User auth (register + login)"
# ─────────────────────────────────────────────────────────────────────────────

TIMESTAMP=$(date +%s)
EMAIL="smoketest_${TIMESTAMP}@bazzar.test"

REGISTER=$(api POST "$BASE/api/v1/auth/register" \
  -d "{\"firstName\":\"Smoke\",\"lastName\":\"Test\",\"email\":\"$EMAIL\",\"phone\":\"9800000001\",\"password\":\"Test@1234\"}")

if echo "$REGISTER" | grep -q '"accessToken"'; then
  ok "POST /api/v1/auth/register → user created ($EMAIL)"
  ACCESS_TOKEN=$(echo "$REGISTER" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
else
  fail "POST /api/v1/auth/register failed: $REGISTER"
  # Try login with the pre-existing test account as fallback
  ACCESS_TOKEN=""
fi

LOGIN=$(api POST "$BASE/api/v1/auth/login" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test@1234\"}")

if echo "$LOGIN" | grep -q '"accessToken"'; then
  ok "POST /api/v1/auth/login → authenticated"
  ACCESS_TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
else
  fail "POST /api/v1/auth/login failed: $LOGIN"
fi

if [ -z "${ACCESS_TOKEN:-}" ]; then
  fail "No access token — cannot continue authenticated steps"
  echo ""
  echo -e "${YELLOW}Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
info "STEP 3 — Fetch products (no auth needed)"
# ─────────────────────────────────────────────────────────────────────────────

PRODUCTS=$(api GET "$BASE/api/v1/products?limit=1")

if echo "$PRODUCTS" | grep -q '"success":true'; then
  TOTAL=$(echo "$PRODUCTS" | grep -o '"total":[0-9]*' | head -1 | grep -o '[0-9]*')
  ok "GET /api/v1/products → ${TOTAL:-?} total products"
else
  fail "GET /api/v1/products failed: $PRODUCTS"
fi

# Grab the first product ID for cart test
PRODUCT_ID=$(echo "$PRODUCTS" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
PRODUCT_NAME=$(echo "$PRODUCTS" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
PRODUCT_PRICE=$(echo "$PRODUCTS" | grep -o '"price":[0-9.]*' | head -1 | grep -o '[0-9.]*$')

if [ -n "${PRODUCT_ID:-}" ]; then
  ok "First product: \"$PRODUCT_NAME\" (id=$PRODUCT_ID, price=Rs.$PRODUCT_PRICE)"
else
  fail "No products in DB — seed the database before running smoke tests"
  PRODUCT_ID="000000000000000000000000"
  PRODUCT_NAME="Test Product"
  PRODUCT_PRICE="500"
fi

# Fetch single product
SINGLE=$(api GET "$BASE/api/v1/products/$PRODUCT_ID")
if echo "$SINGLE" | grep -q '"success":true'; then
  ok "GET /api/v1/products/:id → product detail fetched"
else
  fail "GET /api/v1/products/:id failed: $SINGLE"
fi

# ─────────────────────────────────────────────────────────────────────────────
info "STEP 4 — Add to cart (authenticated)"
# ─────────────────────────────────────────────────────────────────────────────

CART_ADD=$(api POST "$BASE/api/v1/cart/items" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"productId\":    \"$PRODUCT_ID\",
    \"productName\":  \"$PRODUCT_NAME\",
    \"productImage\": \"\",
    \"sellerId\":     \"000000000000000000000001\",
    \"sellerName\":   \"Test Seller\",
    \"unitPrice\":    ${PRODUCT_PRICE:-500},
    \"quantity\":     1,
    \"stock\":        99
  }")

if echo "$CART_ADD" | grep -q '"success":true'; then
  ITEM_COUNT=$(echo "$CART_ADD" | grep -o '"itemCount":[0-9]*' | head -1 | grep -o '[0-9]*')
  ok "POST /api/v1/cart/items → item added (cart has ${ITEM_COUNT:-?} items)"
else
  fail "POST /api/v1/cart/items failed: $CART_ADD"
fi

CART_GET=$(api GET "$BASE/api/v1/cart" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$CART_GET" | grep -q '"success":true'; then
  TOTAL=$(echo "$CART_GET" | grep -o '"total":[0-9.]*' | head -1 | grep -o '[0-9.]*$')
  ok "GET /api/v1/cart → cart total Rs.${TOTAL:-?}"
else
  fail "GET /api/v1/cart failed: $CART_GET"
fi

# ─────────────────────────────────────────────────────────────────────────────
info "STEP 5 — CORS preflight check"
# ─────────────────────────────────────────────────────────────────────────────

CORS_RESP=$(curl -s -I -X OPTIONS "$BASE/api/v1/products" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  --max-time 5)

if echo "$CORS_RESP" | grep -qi "access-control-allow-origin"; then
  ALLOW_ORIGIN=$(echo "$CORS_RESP" | grep -i "access-control-allow-origin" | tr -d '\r')
  ok "CORS preflight → $ALLOW_ORIGIN"
else
  fail "CORS preflight — no Access-Control-Allow-Origin header in response"
fi

if echo "$CORS_RESP" | grep -qi "access-control-allow-credentials: true"; then
  ok "CORS credentials → allowed"
else
  fail "CORS credentials header missing"
fi

# ─────────────────────────────────────────────────────────────────────────────
info "STEP 6 — Unified API index"
# ─────────────────────────────────────────────────────────────────────────────

API_INDEX=$(api GET "$BASE/api/v1")
if echo "$API_INDEX" | grep -q '"modules"'; then
  ok "GET /api/v1 → monolith manifest returned"
else
  fail "GET /api/v1 failed: $API_INDEX"
fi

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Results:  ${GREEN}${PASS} passed${NC}   ${RED}${FAIL} failed${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
