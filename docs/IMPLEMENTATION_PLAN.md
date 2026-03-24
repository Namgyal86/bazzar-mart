# Bazzar — MERN E-Commerce Platform Implementation Plan

## Context

Build a full multi-vendor e-commerce marketplace ("Bazzar") from scratch based on 18 specification documents. The platform uses a **microservices architecture** with 14 Node.js/Express/TypeScript backend services, a Next.js web frontend, and 4 Flutter mobile apps. Currently, only the `/docs` folder exists — this is a greenfield build.

**Key tech:** Node.js 20 + Express + TypeScript + MongoDB (Mongoose) + Redis + Kafka + Elasticsearch + Socket.io + Next.js 14 + Flutter

---

## Current Progress

### PHASE 1: Foundation & Monorepo Setup ✅ COMPLETE
> **Goal:** Scaffold the entire monorepo, shared configs, Docker Compose, and shared packages

**Completed:**
- [x] Monorepo folder structure with npm workspaces
- [x] Root `package.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`
- [x] `packages/shared/` — full shared package:
  - [x] `types/` — API envelope, JWT payload, all Kafka event interfaces, topic constants
  - [x] `errors/` — AppError hierarchy (NotFound, Forbidden, Validation, Conflict, Unauthorized, InsufficientStock)
  - [x] `middleware/auth.ts` — authenticate, requireRole, optionalAuth
  - [x] `middleware/errorHandler.ts` — central error handler with Mongoose error mapping
  - [x] `middleware/validate.ts` — Zod body/query/params validation
  - [x] `kafka/producer.ts` — KafkaJS producer factory with event envelope
  - [x] `kafka/consumer.ts` — KafkaJS consumer factory with topic handler registration
  - [x] `redis/` — ioredis client factory
  - [x] `logger/` — Winston structured logging factory
- [x] `docker-compose.yml` — MongoDB 7, Redis 7, Kafka + Zookeeper, Elasticsearch 8, all 14 services, Next.js frontend
- [x] Directory structure for all 14 services, web, mobile (4 apps), infrastructure (k8s, terraform)

### PHASE 2: User Service ✅ COMPLETE
> **Port:** 8001 | **DB:** user_db

**Completed:**
- [x] Models: User, Address (with GeoJSON), RefreshToken (with TTL index)
- [x] Repositories: UserRepository, AddressRepository, RefreshTokenRepository
- [x] Services: AuthService (register, login, logout, refresh, password reset), UserService (profile CRUD), AddressService (CRUD)
- [x] Controllers: AuthController, UserController, AddressController
- [x] Zod validation schemas for all inputs
- [x] Routes: all auth + user + address + admin endpoints per API_SPECIFICATION.md
- [x] Health check route (DB + Redis)
- [x] JWT issuance with roles, bcrypt hashing, referral code generation
- [x] Kafka producer: user.registered event
- [x] OTP password reset via Redis (5min TTL)
- [x] app.ts (Express factory) + server.ts (entry point with graceful shutdown)
- [x] package.json, tsconfig.json, Dockerfile (multi-stage)

---

## Remaining Phases

### PHASE 3: Product Service ✅ COMPLETE
> **Port:** 8002 | **DB:** product_db

**Completed:**
- Models: `Product`, `Category`, `ProductVariant`, `ProductImage`
- Public endpoints: GET /products (with filters/pagination), GET /products/:id, GET /categories
- Seller endpoints: GET/POST/PUT/DELETE /seller/products, bulk JSON import, inventory update
- Redis caching (product detail: 2min TTL, listings: 5min TTL)
- Kafka producers: `product.created`, `product.updated`, `inventory.updated`
- S3 image upload via presigned URLs + AWS SDK v3
- Unit tests for ProductService

**Files created:**
- config/s3.ts, services/image.service.ts, controllers/image.controller.ts
- tests/unit/product.service.test.ts, jest.config.js

---

### PHASE 4: Cart Service ⬜ TODO
> **Port:** 8003 | **DB:** Redis (no MongoDB)

**Tasks:**
1. Redis-backed cart storage (Hash per user, 7-day TTL)
2. Save-for-later functionality (separate Redis key, 30-day TTL)
3. Endpoints: GET/POST/PATCH/DELETE cart items, clear cart
4. Stock validation via REST call to Product Service before adding items
5. Kafka producer: `cart.updated`

**Files to create:**
- config/env.ts, config/redis.ts (no db.ts — Redis only)
- services/cart.service.ts (Redis hash operations, Axios call to product-service for stock check)
- controllers/cart.controller.ts
- middleware/validation.ts
- routes/cart.routes.ts, routes/health.routes.ts
- app.ts, server.ts
- package.json, tsconfig.json, Dockerfile

---

### PHASE 5: Order Service ⬜ TODO
> **Port:** 8004 | **DB:** order_db

**Tasks:**
1. Models: `Order`, `OrderItem` with status history
2. Checkout flow: validate cart → reserve stock (REST to Product Svc) → create order
3. Coupon code + referral credits integration (REST to Referral Svc)
4. Buyer endpoints: POST /orders/checkout, GET /orders, POST /orders/:id/cancel
5. Seller endpoints: GET /seller/orders, PATCH status, POST tracking
6. Admin endpoints: GET /admin/orders
7. Kafka producers: `order.created`, `order.confirmed`, `order.status_changed`, `order.cancelled`
8. Kafka consumer: `payment.success` → confirm order, `payment.failed` → cancel order
9. Kafka consumer: `delivery.completed` → mark DELIVERED

**Files to create:**
- config/, models/ (order, orderItem), repositories/, services/ (order, checkout)
- controllers/, routes/, kafka/consumers/ (payment, delivery consumers)
- middleware/validation.ts
- app.ts, server.ts, package.json, tsconfig.json, Dockerfile

---

### PHASE 6: Payment Service ⬜ TODO
> **Port:** 8005 | **DB:** payment_db

**Tasks:**
1. Models: `Payment`, `Refund`, `PaymentAuditLog`
2. Gateway classes:
   - `KhaltiGateway` — ePay API initiate + lookup verify + HMAC webhook
   - `ESewaGateway` — form field generation + HMAC-SHA256 signature + redirect verify
   - `FonepayGateway` — MD5 signed initiate + QR + verify
   - `StripeGateway` — PaymentIntent + webhook constructEvent
   - `RazorpayGateway` — order create + HMAC verify
3. `PaymentService` — unified orchestrator (switch on method)
4. `AuditLogger` — immutable log of every gateway event
5. 5 webhook receivers with per-gateway signature verification
6. Idempotency guard (no duplicate charges per orderId)
7. Refund logic (per gateway)
8. COD flow
9. Kafka producers: `payment.success`, `payment.failed`, `payment.refunded`

---

### PHASE 7: Review Service ⬜ TODO
> **Port:** 8006 | **DB:** review_db

**Tasks:**
1. Model: `Review` (verified purchase check via REST to Order Svc)
2. Endpoints: GET/POST/PATCH/DELETE reviews, helpful count, report
3. Image upload for review photos
4. Kafka producer: `review.posted`

---

### PHASE 8: Seller Service ⬜ TODO
> **Port:** 8007 | **DB:** seller_db

**Tasks:**
1. Models: `Seller`, `SellerBankAccount`, `SellerPayout`
2. Registration + admin approval workflow
3. Seller dashboard stats + analytics endpoints
4. Admin endpoints: list sellers, approve/suspend
5. Kafka consumer: `payment.success` → queue payout
6. Kafka producer: `seller.approved`, `payout.processed`

---

### PHASE 9: Notification Service ⬜ TODO
> **Port:** 8008 | **DB:** notification_db

**Tasks:**
1. Models: `NotificationLog`, `UserNotificationPreferences`
2. Providers: EmailProvider (SendGrid), SMSProvider (Sparrow SMS), FCMProvider
3. `NotificationService` dispatcher with preference checking
4. Kafka consumers for all 18 event types
5. BullMQ retry queue (3x exponential backoff)
6. User-facing endpoints: GET notifications, mark read, preferences CRUD

---

### PHASE 10: Search Service ⬜ TODO
> **Port:** 8009 | **DB:** Elasticsearch (no MongoDB)

**Tasks:**
1. ES index creation scripts: `products`, `product_suggestions`
2. Full query builder (multi_match, filters, faceted aggregations)
3. Autocomplete using `completion` suggester
4. Kafka consumers: product/review/inventory events → update index
5. Redis cache for search results (1min TTL)

---

### PHASE 11: Delivery Service ⬜ TODO
> **Port:** 8013 | **DB:** delivery_db

**Tasks:**
1. Models: `DeliveryAgent`, `DeliveryTask`, `LocationHistory` (TTL 30d), `AgentEarning`
2. GeoJSON 2dsphere index for nearest-agent queries
3. `AssignmentService` — $geoNear aggregation, BullMQ retry on no-agent
4. **Socket.io server** for real-time tracking
5. Agent/Buyer/Admin endpoints
6. Kafka consumer: `order.confirmed` → create task + assign
7. Kafka producers: delivery lifecycle events

---

### PHASE 12: Recommendation Service ⬜ TODO
> **Port:** 8010 | **DB:** recommendation_db

**Tasks:**
1. Models: `UserProductInteraction`, `ProductSimilarity`, `TrendingProducts`
2. Collaborative filtering + content-based similarity
3. BullMQ hourly trending cron job
4. Kafka consumers, Redis cache, REST endpoints

---

### PHASE 13: Analytics Service ⬜ TODO
> **Port:** 8014 | **DB:** analytics_db

**Tasks:**
1. Models: `PlatformMetrics`, `SellerMetrics`, `ProductMetrics`, `UserEvents`
2. Kafka consumers for all metric events
3. BullMQ daily aggregation cron
4. Admin + seller dashboard endpoints

---

### PHASE 14: Storefront Designer Service ⬜ TODO
> **Port:** 8011 | **DB:** storefront_db

**Tasks:**
1. Models: `StorefrontDesign`, `StorefrontVersion`, `StorefrontAsset`
2. CRUD for draft designs, JSON → HTML via Handlebars
3. S3 upload + CDN invalidation, version history + rollback
4. BullMQ async rendering job
5. Handlebars templates for 10 section types

---

### PHASE 15: Referral Service ⬜ TODO
> **Port:** 8012 | **DB:** referral_db

**Tasks:**
1. Models: `ReferralConfig`, `Referral`, `ReferralWallet`, `ReferralCreditTransaction`, `ReferralIdentityClaim`
2. Code generation, wallet with atomic credit/debit (MongoDB transactions)
3. Anti-abuse: SHA-256 identity hashing, self-referral detection
4. Kafka consumers/producers, BullMQ daily credit expiry job

---

### PHASE 16: API Gateway (Kong) ✅ COMPLETE

**Tasks:**
1. Kong declarative config (kong.yml)
2. Service + route definitions for all 14 microservices
3. JWT plugin, rate limiting, CORS
4. Add to docker-compose

---

### PHASE 17: Next.js Web Frontend ✅ COMPLETE

**Sub-sections:**
- **A. Foundation:** Next.js 14 App Router, Tailwind + shadcn/ui, Zustand + TanStack Query, Axios, Socket.io-client, Auth pages
- **B. Buyer Pages:** Home, product listing/detail, search, cart, checkout, payment integration, orders, live tracking, reviews, referral dashboard, profile
- **C. Seller Dashboard:** Overview, product/inventory/order management, analytics, Storefront Designer (drag-and-drop with dnd-kit)
- **D. Admin Dashboard:** Platform analytics, user/seller/product/order/delivery/referral/coupon management

---

### PHASE 18: Infrastructure & DevOps ✅ COMPLETE

**Tasks:**
1. Kubernetes manifests per service
2. Terraform AWS infrastructure
3. GitHub Actions CI/CD pipeline
4. Prometheus + Grafana monitoring
5. Winston → CloudWatch logging

---

## Build Order Summary

| Phase | Service/Component | Status | Depends On |
|-------|-------------------|--------|-----------|
| 1 | Foundation + Docker Compose + Shared packages | ✅ Done | Nothing |
| 2 | User Service | ✅ Done | Phase 1 |
| 3 | Product Service | ✅ Done | Phase 1 |
| 4 | Cart Service | ✅ Done | Phase 3 |
| 5 | Order Service | ✅ Done | Phase 3, 4 |
| 6 | Payment Service | ✅ Done | Phase 5 |
| 7 | Review Service | ✅ Done | Phase 3, 5 |
| 8 | Seller Service | ✅ Done | Phase 2, 6 |
| 9 | Notification Service | ✅ Done | Phase 2 |
| 10 | Search Service | ✅ Done | Phase 3 |
| 11 | Delivery Service | ✅ Done | Phase 5 |
| 12 | Recommendation Service | ✅ Done | Phase 3, 7 |
| 13 | Analytics Service | ✅ Done | Phase 5, 6 |
| 14 | Storefront Designer | ✅ Done | Phase 3, 8 |
| 15 | Referral Service | ✅ Done | Phase 2, 5 |
| 16 | Kong API Gateway | ✅ Done | All services |
| 17 | Next.js Frontend | ✅ Done | All services |
| 18 | Infrastructure/DevOps | ✅ Done | All above |

---

## Key Architecture Decisions

1. **All 14 services in Node.js/Express/TypeScript** — MERN stack consistency
2. **Handlebars** instead of Jinja2 for storefront HTML rendering
3. **BullMQ** instead of Celery for async jobs
4. **MongoDB transactions** for atomic wallet operations
5. **sanitize-html** for HTML sanitization
6. **Shared packages** via npm workspaces — no duplicated middleware/errors/kafka across services

---

## Service Pattern (Every Service Follows This)

```
{service-name}/
├── src/
│   ├── config/env.ts          # Zod-validated env vars
│   ├── config/db.ts           # Mongoose connection
│   ├── config/redis.ts        # ioredis client
│   ├── models/*.model.ts      # Mongoose schemas + TS interfaces
│   ├── repositories/*.ts      # DB queries only — no logic
│   ├── services/*.ts          # Business logic — no req/res
│   ├── controllers/*.ts       # Thin: validate → service → respond
│   ├── routes/*.ts            # Express routers with middleware
│   ├── middleware/validation.ts # Zod schemas
│   ├── kafka/producer.ts      # (uses shared)
│   ├── kafka/consumers/*.ts   # Per-topic handlers
│   ├── jobs/*.ts              # BullMQ workers
│   ├── app.ts                 # Express app factory
│   └── server.ts              # Entry: listen + connect
├── tests/{unit,integration}/
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Standard Response Envelope

```json
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 847, "totalPages": 43 } }

// Error
{ "success": false, "error": "Human-readable message", "code": "ERROR_CODE" }
```
