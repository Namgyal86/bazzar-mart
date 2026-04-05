# Bazzar — Final Build Plan
> Last updated: 2026-04-05 | Architecture: Modular Monolith

---

## Project Summary

**Bazzar** is a full multi-vendor e-commerce marketplace (Nepal-focused) with:
- 1 Node.js/Express/TypeScript **modular monolith** (`api-monolith`) — 13 modules
- 2 independent Node.js services: `delivery-service`, `notification-service`
- Next.js 14 web frontend (buyer + seller + admin dashboards)
- 4 Flutter mobile apps (Buyer, Seller, Admin, Delivery)
- Single MongoDB `bazzar_monolith` database + Redis + Kafka
- Nepal payment gateways: Khalti, eSewa, Fonepay + COD
- Real-time GPS delivery tracking via Socket.io
- Kong API Gateway, AWS EKS, Terraform, GitHub Actions CI/CD

---

## Monorepo Root Structure

```
bazzar-mart/
├── packages/
│   └── shared/                    # @bazzar/shared — types, errors
│       ├── src/
│       │   ├── types/             # API envelope, JWT payload, Kafka event interfaces
│       │   └── errors/            # AppError hierarchy
│       ├── package.json
│       └── tsconfig.json
│
├── services/
│   ├── api-monolith/              # Port 8100 | DB: bazzar_monolith (MongoDB)
│   │   └── src/
│   │       ├── config/
│   │       │   ├── env.ts         # Zod-validated env — crash on missing
│   │       │   ├── db.ts          # Single Mongoose connection
│   │       │   └── redis.ts       # Single ioredis client
│   │       ├── shared/
│   │       │   ├── middleware/
│   │       │   │   ├── auth.ts    # JWT authenticate + requireRole
│   │       │   │   └── error.ts   # Central error → HTTP mapper
│   │       │   └── events/
│   │       │       └── emitter.ts # Typed InternalBus (EventEmitter)
│   │       ├── kafka/
│   │       │   ├── producer.ts    # Single shared Kafka producer
│   │       │   └── consumers/     # Single consumer loop (delivery.completed)
│   │       ├── modules/
│   │       │   ├── users/         # auth.controller, user.controller, user.routes
│   │       │   ├── products/      # product.controller, product.routes, models/
│   │       │   ├── cart/          # cart.service (Redis), cart.controller, cart.routes
│   │       │   ├── orders/        # order.controller, order.routes, models/
│   │       │   ├── payments/      # payment.controller, payment.routes, services/
│   │       │   ├── sellers/       # seller.controller, seller.routes, models/
│   │       │   ├── reviews/       # review.controller, review.routes, models/
│   │       │   ├── referrals/     # referral.controller, referral.routes, models/
│   │       │   ├── support/       # support.controller, support.routes, models/
│   │       │   ├── storefront/    # storefront.controller, storefront.routes, models/
│   │       │   ├── search/        # search.controller, search.routes
│   │       │   ├── recommendations/ # recommendation.controller, model, routes
│   │       │   └── analytics/     # analytics.controller, model, routes
│   │       ├── app.ts             # Express factory — mounts all 13 module routers
│   │       └── server.ts          # Entry: DB + Redis + Kafka + handlers → listen
│   │
│   ├── delivery-service/          # Port 8013 | DB: delivery_db | Socket.io
│   └── notification-service/      # Port 8008 | Stateless | Kafka consumers
│
├── web/                           # Next.js 14 (port 3000)
├── mobile/
│   ├── buyer_app/                 # Flutter
│   ├── seller_app/                # Flutter
│   ├── admin_app/                 # Flutter
│   └── delivery_app/              # Flutter
├── infrastructure/
│   ├── k8s/                       # Kubernetes manifests (3 deployments)
│   ├── terraform/                 # AWS EKS, MSK, ElastiCache, Atlas
│   ├── kong/                      # kong.yml declarative config
│   └── github-actions/            # CI/CD workflows
├── docs/                          # Architecture and spec documents
├── docker-compose.yml
├── package.json                   # npm workspaces root
├── tsconfig.base.json
└── .env.example
```

---

## Module Pattern (inside api-monolith)

Each module follows this pattern — no repositories layer, logic is in controllers:

```
src/modules/{module-name}/
├── models/
│   └── {entity}.model.ts      # Mongoose schema + interface
│                               # Guard: mongoose.models.X ?? mongoose.model(X, schema)
├── {module}.controller.ts     # Route handlers + registerXxxEventHandlers()
└── {module}.routes.ts         # Express Router
```

**Shared across all modules:**
```
src/shared/middleware/auth.ts      # authenticate, requireRole
src/shared/events/emitter.ts      # InternalBus — typed EventEmitter
src/config/db.ts                  # connectDB() — single Mongoose connection
src/config/redis.ts               # connectRedis() / getRedis()
src/kafka/producer.ts             # connectProducer() / publishEvent()
src/kafka/consumers/index.ts      # startConsumers() — delivery.completed
```

---

## Build Phases — Status

| Phase | Component | Status | Notes |
|-------|-----------|--------|-------|
| 1 | Monorepo foundation, shared packages, Docker Compose | ✅ Done | npm workspaces |
| 2 | api-monolith: users module | ✅ Done | Auth, JWT, profile, addresses, wishlist |
| 3 | api-monolith: products module | ✅ Done | CRUD, categories, banners, seeds |
| 4 | api-monolith: cart module | ✅ Done | Redis-backed, 7-day TTL |
| 5 | api-monolith: orders module | ✅ Done | Full lifecycle, coupons, admin |
| 6 | api-monolith: payments module | ✅ Done | Khalti, eSewa, Fonepay, COD |
| 7 | api-monolith: reviews module | ✅ Done | Auto rating update via internalBus |
| 8 | api-monolith: sellers module | ✅ Done | Direct Mongoose (no axios) |
| 9 | notification-service | ✅ Done | Kafka consumers (providers pending) |
| 10 | api-monolith: search module | ✅ Done | Direct Product Mongoose queries |
| 11 | delivery-service | ✅ Done | Socket.io, GPS, lifecycle |
| 12 | api-monolith: recommendations module | ✅ Done | View model, internalBus handlers |
| 13 | api-monolith: analytics module | ✅ Done | Event model, internalBus handlers, admin KPIs |
| 14 | api-monolith: storefront module | ✅ Done | BYOS seller storefront CRUD |
| 15 | api-monolith: referrals module | ✅ Done | Wallet credit via internalBus |
| 16 | api-monolith: support module | ✅ Done | Buyer-seller messaging |
| 17 | Kong API Gateway | ✅ Done | Routes to port 8100 |
| 18 | Next.js Web Frontend | ✅ Done | All buyer/seller/admin pages |
| 19 | Infrastructure (K8s + Terraform + CI/CD) | ✅ Done | 3-deployment EKS layout |

---

## Architecture Rules (Non-Negotiable)

1. **Single MongoDB** — all 13 monolith modules share `bazzar_monolith`; never separate per-module DBs
2. **InternalBus first** — module-to-module communication via `internalBus.emit/on`; Kafka only for external processes
3. **No axios between modules** — direct Mongoose queries or internalBus; axios only for delivery/external services
4. **Mongoose model guard** — `mongoose.models.X ?? mongoose.model(X, schema)` on every model to prevent hot-reload duplicates
5. **Single Kafka consumer loop** — `src/kafka/consumers/index.ts` is the only consumer; emits onto internalBus
6. **Health endpoint** — `GET /health` returns `{ status: 'ok', service: 'api-monolith', uptime }`
7. **Secrets via env** — Zod schema in `src/config/env.ts` validates all required vars at startup
8. **JWT roles** — `BUYER | SELLER | ADMIN | DELIVERY` enforced via `requireRole()` middleware
9. **Standard response envelope** — `{ success: boolean, data?, error?, meta? }`
10. **TypeScript strict** — no `any`, explicit return types on all handlers

---

## InternalBus Event Map

| Constant | String value | Producer | Consumers |
|----------|-------------|----------|-----------|
| `EVENTS.PAYMENT_SUCCESS` | `payment:success` | payments | orders, sellers, analytics |
| `EVENTS.PAYMENT_FAILED` | `payment:failed` | payments | orders |
| `EVENTS.ORDER_CREATED` | `order:created` | orders | referrals, recommendations, analytics |
| `EVENTS.REVIEW_POSTED` | `review:posted` | reviews | reviews (rating), recommendations |
| `EVENTS.DELIVERY_COMPLETED` | `delivery:completed` | kafka/consumers | orders, analytics |
| `EVENTS.USER_REGISTERED` | `user:registered` | auth.controller | analytics |
| `EVENTS.PRODUCT_CREATED` | `product:created` | products | recommendations |

---

## Kafka Topics (External Only)

| Topic | Producer | Consumers |
|-------|----------|-----------|
| `order.created` | api-monolith | notification-service, delivery-service |
| `order.status_updated` | api-monolith | notification-service |
| `payment.success` | api-monolith | notification-service |
| `payment.failed` | api-monolith | notification-service |
| `user.registered` | api-monolith | notification-service |
| `seller.approved` | api-monolith | notification-service |
| `delivery.completed` | delivery-service | api-monolith (orders + analytics) |
| `delivery.assigned` | delivery-service | notification-service |
| `delivery.failed` | delivery-service | notification-service |

---

## Payment Gateways

| Gateway | Type | Integration |
|---------|------|-------------|
| Khalti | Nepal digital wallet | ePay API + server-side lookup verify |
| eSewa | Nepal digital wallet | HMAC-SHA256 form signature + redirect verify |
| Fonepay | Nepal bank QR | MD5 signed initiate + QR + verify |
| COD | Cash on delivery | No gateway — status flow only |

---

## Socket.io Events (delivery-service — Port 8013)

| Event | Direction | Actor | Payload |
|-------|-----------|-------|---------|
| `track:join` | Client→Server | BUYER | `{ orderId }` |
| `delivery:location_update` | Client→Server | DELIVERY | `{ deliveryTaskId, lat, lng }` |
| `delivery:location_broadcast` | Server→Client | BUYER | `{ lat, lng, estimatedArrival }` |
| `delivery:status_changed` | Server→Client | BUYER | `{ status, message }` |
| `delivery:new_assignment` | Server→Client | DELIVERY | `{ taskId, pickupAddress, deliveryAddress }` |

---

## Environment Variables

```bash
# Monolith (api-monolith)
NODE_ENV=development
PORT=8100
MONGO_URI=mongodb://localhost:27017/bazzar_monolith
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=api-monolith
KAFKA_GROUP_ID=api-monolith-group
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Payment gateways
KHALTI_SECRET_KEY=
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q(
ESEWA_MERCHANT_CODE=EPAYTEST
API_BASE_URL=http://localhost:8100
WEB_URL=http://localhost:3000

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=bazzar-assets
CLOUDFRONT_URL=https://cdn.bazzar.com

# Notification service
SENDGRID_API_KEY=
SPARROW_SMS_TOKEN=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Delivery service
DELIVERY_MONGO_URI=mongodb://localhost:27017/delivery_db
```

---

## Standard Response Envelope

```json
// Success (single item)
{ "success": true, "data": { ... } }

// Success (list)
{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 847, "pages": 43 } }

// Error
{ "success": false, "error": "Human-readable message" }
```
