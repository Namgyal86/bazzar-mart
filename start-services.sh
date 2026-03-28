#!/bin/bash
# Bazzar — Start All Microservices (Linux/Mac)

echo "========================================"
echo " Bazzar — Starting All Microservices"
echo "========================================"

SERVICES=(
  "user-service:8001"
  "product-service:8002"
  "cart-service:8003"
  "order-service:8004"
  "payment-service:8005"
  "review-service:8006"
  "seller-service:8007"
  "notification-service:8008"
  "search-service:8009"
  "recommendation-service:8010"
  "storefront-designer-service:8011"
  "referral-service:8012"
  "delivery-service:8013"
  "analytics-service:8014"
  "support-service:8015"
)

# Copy root .env to each service
for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  if [ ! -f "services/$svc/.env" ]; then
    cp .env "services/$svc/.env"
    echo "  ✓ Copied .env to $svc"
  fi
done

echo ""
echo "Installing dependencies..."
for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  echo "  → $svc"
  (cd "services/$svc" && npm install --silent 2>/dev/null)
done

echo ""
echo "Starting services..."
for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  port="${entry##*:}"
  (cd "services/$svc" && npm run dev > "../../logs/$svc.log" 2>&1 &)
  echo "  ✓ $svc on :$port"
done

# Start frontend
echo ""
echo "Starting Frontend..."
mkdir -p logs
(cd web && npm run dev > "../logs/frontend.log" 2>&1 &)

echo ""
echo "========================================"
echo " All services started!"
echo " Frontend: http://localhost:3000"
echo " Logs:     ./logs/"
echo "========================================"
