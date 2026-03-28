@echo off
echo ========================================
echo  Bazzar — Starting All Microservices
echo ========================================

:: Copy root .env to each service (if they don't have one)
for %%s in (user-service product-service cart-service order-service payment-service review-service seller-service notification-service search-service recommendation-service referral-service storefront-designer-service delivery-service analytics-service support-service) do (
  if not exist "services\%%s\.env" (
    copy ".env" "services\%%s\.env" >/dev/null
  )
)

echo.
echo [1/15] Installing dependencies for all services...
for %%s in (user-service product-service cart-service order-service payment-service review-service seller-service notification-service search-service recommendation-service referral-service storefront-designer-service delivery-service analytics-service support-service) do (
  echo   Installing: %%s
  cd services\%%s
  call npm install --silent 2>/dev/null
  cd ..\..
)

echo.
echo [2/14] Starting services in background...

start "User Service :8001"         cmd /k "cd services\user-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Product Service :8002"      cmd /k "cd services\product-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Cart Service :8003"         cmd /k "cd services\cart-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Order Service :8004"        cmd /k "cd services\order-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Payment Service :8005"      cmd /k "cd services\payment-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Review Service :8006"       cmd /k "cd services\review-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Seller Service :8007"       cmd /k "cd services\seller-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Notification Service :8008" cmd /k "cd services\notification-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Search Service :8009"       cmd /k "cd services\search-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Recommendation :8010"       cmd /k "cd services\recommendation-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Storefront :8011"           cmd /k "cd services\storefront-designer-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Referral :8012"             cmd /k "cd services\referral-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Delivery :8013"             cmd /k "cd services\delivery-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Analytics :8014"            cmd /k "cd services\analytics-service && npm run dev"
timeout /t 1 /nobreak >/dev/null
start "Support :8015"             cmd /k "cd services\support-service && npm run dev"

echo.
echo [3/3] Starting Frontend...
timeout /t 3 /nobreak >/dev/null
start "Frontend :3000" cmd /k "cd web && npm run dev"

echo.
echo ========================================
echo  All services starting!
echo  Frontend:  http://localhost:3000
echo  Services:  ports 8001-8014
echo ========================================
