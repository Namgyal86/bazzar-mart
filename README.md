# Bazzar — Nepal's Multi-Vendor E-Commerce Platform

A production-ready **modular monolith** e-commerce platform built for Nepal, supporting multiple vendors, payment gateways (Khalti, eSewa, Fonepay), real-time delivery tracking, and 4 client apps.

---

## Table of Contents

- [Architecture](#architecture)
- [Services](#services)
- [Event Communication](#event-communication)
- [Quick Start](#quick-start)
- [Docker Compose (Recommended)](#docker-compose-recommended)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Payment Gateways](#payment-gateways)
- [Tech Stack](#tech-stack)
- [Mobile Apps](#mobile-apps)
- [Deployment](#deployment)

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                      CLIENTS                         │
│  Next.js Web :3000  │  Flutter: Buyer / Seller /     │
│  (Buyer+Seller+Admin│  Admin / Delivery Apps         │
└────────────┬────────┴─────────────────┬──────────────┘
             │                          │
             ▼                          ▼
┌─────────────────────────────────────────────────────┐
│              Kong API Gateway                       │
│   JWT auth · Rate limiting · CORS · Routing         │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
  ┌───────────────┐    ┌────────────────────┐
  │ API Monolith  │    │  Delivery Service  │
  │   port 8100   │    │  port 8013         │
  │ 13 modules    │    │  Socket.io GPS     │
  └───────┬───────┘    └────────────────────┘
          │
          ▼
  ┌───────────────┐    ┌────────────────────┐
  │ Apache Kafka  │───►│ Notification Svc   │
  │ (external bus)│    │  port 8008         │
  └───────────────┘    │  Email/SMS/Push    │
                       └────────────────────┘

Data stores:
  api-monolith    → MongoDB: bazzar_monolith (single DB, all collections)
                  → Redis (cart + rate limits)
  delivery-service → MongoDB: delivery_db
```

**Communication patterns:**
1. **Client → Kong → API Monolith** — all user-facing requests (single process)
2. **InternalBus (EventEmitter)** — in-process events between modules (zero latency, no serialization)
3. **Kafka (async)** — events crossing process boundaries to delivery-service and notification-service

---

## Services

### API Monolith — port 8100

All 13 modules run in a single Node.js process, sharing one MongoDB database and one Redis connection.

| Module | Original Port | Route Prefix |
|--------|--------------|-------------|
| users | 8001 | `/api/v1/auth`, `/api/v1/users` |
| products | 8002 | `/api/v1/products`, `/api/v1/categories`, `/api/v1/banners` |
| cart | 8003 | `/api/v1/cart` |
| orders | 8004 | `/api/v1/orders`, `/api/v1/coupons` |
| payments | 8005 | `/api/v1/payments` |
| reviews | 8006 | `/api/v1/reviews` |
| sellers | 8007 | `/api/v1/seller` |
| referrals | 8012 | `/api/v1/referrals` |
| support | 8015 | `/api/v1/support` |
| storefront | 8011 | `/api/v1/storefront` |
| search | 8009 | `/api/v1/search` |
| recommendations | 8010 | `/api/v1/recommendations` |
| analytics | 8014 | `/api/v1/analytics` |

### Independent Services

| Service | Port | Description |
|---------|------|-------------|
| delivery-service | 8013 | Driver assignment, real-time GPS via Socket.io, delivery lifecycle |
| notification-service | 8008 | Email (SendGrid), SMS (Sparrow SMS), push (Firebase FCM) via Kafka consumers |

---

## Event Communication

### InternalBus (in-process — zero overhead)

| Event | From | To |
|-------|------|----|
| `payment:success` | payments | orders (confirm), sellers (credit balance), analytics |
| `payment:failed` | payments | orders (cancel) |
| `order:created` | orders | referrals (wallet credit), recommendations (purchase interaction), analytics |
| `review:posted` | reviews | reviews (recalc product rating), recommendations |
| `delivery:completed` | Kafka consumer | orders (mark DELIVERED), analytics |
| `user:registered` | auth | analytics (new user count) |
| `product:created` | products | recommendations (seed trending) |

### Kafka (external — crosses process boundaries)

| Topic | Published by | Consumed by |
|-------|-------------|-------------|
| `order.created` | api-monolith | notification-service, delivery-service |
| `order.status_updated` | api-monolith | notification-service |
| `payment.success` | api-monolith | notification-service |
| `payment.failed` | api-monolith | notification-service |
| `user.registered` | api-monolith | notification-service |
| `seller.approved` | api-monolith | notification-service |
| `delivery.completed` | delivery-service | api-monolith |
| `delivery.assigned` | delivery-service | notification-service |

---

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 7
- Redis 7
- Kafka (local or Confluent Cloud)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/bazzar-mart.git
cd bazzar-mart
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env — set MONGO_URI, REDIS_URL, JWT secrets, KAFKA_BROKERS, payment keys
```

### 3. Start the Monolith

```bash
npm run dev:monolith
# http://localhost:8100
# http://localhost:8100/health
# http://localhost:8100/api/v1
```

### 4. Start Frontend

```bash
npm run dev:web
# http://localhost:3000
```

---

## Docker Compose (Recommended)

```bash
cp .env.example .env

# Start infrastructure + all services + frontend
docker-compose up -d

# Logs
docker-compose logs -f api-monolith

# Stop
docker-compose down
```

Minimum specs: **8 GB RAM, 4 CPU cores** (significantly reduced from the old microservices setup).

---

## Environment Variables

All variables are Zod-validated at startup — the process exits immediately on missing required vars.

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string (`bazzar_monolith` database) |
| `REDIS_URL` | `redis://host:6379` |
| `JWT_ACCESS_SECRET` | Sign/verify access tokens |
| `JWT_REFRESH_SECRET` | Sign/verify refresh tokens |
| `KAFKA_BROKERS` | Comma-separated broker list |
| `PORT` | Monolith port (default `8100`) |
| `KHALTI_SECRET_KEY` | Khalti payment gateway secret |
| `ESEWA_SECRET_KEY` | eSewa HMAC secret (UAT: `8gBm/:&EnhH.1/q(`) |
| `ESEWA_MERCHANT_CODE` | eSewa merchant code (UAT: `EPAYTEST`) |
| `API_BASE_URL` | Public URL of the monolith (used in payment callbacks) |
| `WEB_URL` | Frontend URL (used in payment redirects) |
| `SENDGRID_API_KEY` | Transactional email (notification-service) |
| `SPARROW_SMS_TOKEN` | Nepal SMS gateway (notification-service) |
| `FIREBASE_SERVICE_ACCOUNT` | FCM push notifications (notification-service) |
| `AWS_BUCKET_NAME` | S3 product image uploads |

---

## API Reference

All routes are prefixed `/api/v1/` and served by the monolith on port **8100**.

### Auth / Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register new user |
| POST | `/api/v1/auth/login` | — | Login, returns JWT pair |
| POST | `/api/v1/auth/refresh` | — | Refresh access token |
| POST | `/api/v1/auth/logout` | Bearer | Revoke refresh token |
| GET | `/api/v1/users/me` | Bearer | Get own profile |
| PUT | `/api/v1/users/me` | Bearer | Update profile |
| GET | `/api/v1/users/me/addresses` | Bearer | List addresses |
| POST | `/api/v1/users/me/addresses` | Bearer | Add address |
| PUT | `/api/v1/users/me/addresses/:id` | Bearer | Update address |
| DELETE | `/api/v1/users/me/addresses/:id` | Bearer | Delete address |
| GET | `/api/v1/users/me/wishlist` | Bearer | Get wishlist |
| POST | `/api/v1/users/me/wishlist/:productId` | Bearer | Add to wishlist |
| DELETE | `/api/v1/users/me/wishlist/:productId` | Bearer | Remove from wishlist |

### Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/products` | — | List products (filter/sort/page) |
| GET | `/api/v1/products/:id` | — | Get product detail |
| POST | `/api/v1/products` | SELLER | Create product |
| PUT | `/api/v1/products/:id` | SELLER | Update product |
| DELETE | `/api/v1/products/:id` | SELLER | Delete product |
| GET | `/api/v1/categories` | — | List categories |
| GET | `/api/v1/banners` | — | List banners |

### Cart

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/cart` | Bearer | Get cart with total |
| POST | `/api/v1/cart/items` | Bearer | Add item |
| PUT | `/api/v1/cart/items/:productId` | Bearer | Update quantity |
| DELETE | `/api/v1/cart/items/:productId` | Bearer | Remove item |
| DELETE | `/api/v1/cart` | Bearer | Clear cart |

### Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/orders` | Bearer | Place order |
| GET | `/api/v1/orders` | Bearer | List own orders |
| GET | `/api/v1/orders/:id` | Bearer | Order detail |
| PUT | `/api/v1/orders/:id/cancel` | Bearer | Cancel order |
| GET | `/api/v1/orders/seller` | SELLER | Seller's orders |
| PUT | `/api/v1/orders/:id/status` | SELLER | Update status |
| GET | `/api/v1/orders/admin` | ADMIN | All orders |
| GET | `/api/v1/orders/admin/stats` | ADMIN | Order statistics |

### Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/payments/initiate` | Bearer | Initiate payment |
| GET | `/api/v1/payments/khalti/callback` | — | Khalti redirect handler |
| GET | `/api/v1/payments/esewa/callback` | — | eSewa redirect handler |
| POST | `/api/v1/payments/verify` | Bearer | Manual verify |
| GET | `/api/v1/payments/order/:orderId` | Bearer | Payment by order |
| GET | `/api/v1/payments/admin/list` | ADMIN | All payments |

### Reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/reviews/product/:productId` | — | Product reviews |
| POST | `/api/v1/reviews` | Bearer | Post review |
| PUT | `/api/v1/reviews/:id` | Bearer | Edit own review |
| DELETE | `/api/v1/reviews/:id` | Bearer | Delete own review |

### Sellers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/seller/register` | Bearer | Seller application |
| GET | `/api/v1/seller/profile` | SELLER | Seller profile |
| PUT | `/api/v1/seller/profile` | SELLER | Update profile |
| GET | `/api/v1/seller/dashboard` | SELLER | Revenue, orders, payout stats |
| GET | `/api/v1/seller/admin/pending` | ADMIN | Pending applications |
| PUT | `/api/v1/seller/admin/:id/approve` | ADMIN | Approve seller |

### Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/search?q=term` | — | Full-text product search |
| GET | `/api/v1/search/products` | — | Search with all filters |
| GET | `/api/v1/search/suggestions?q=term` | — | Autocomplete suggestions |
| GET | `/api/v1/search/similar/:productId` | — | Similar products |

### Recommendations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/recommendations/track` | — | Track product view |
| GET | `/api/v1/recommendations/for/:userId` | — | Personalized recommendations |
| GET | `/api/v1/recommendations/similar/:productId` | — | Similar products |
| GET | `/api/v1/recommendations/trending` | — | Trending products |

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/analytics/event` | — | Track client event |
| GET | `/api/v1/analytics/platform-health` | — | Service health check |
| GET | `/api/v1/analytics/admin/overview` | ADMIN | Platform KPI dashboard |
| GET | `/api/v1/analytics/admin/revenue` | ADMIN | Revenue over time |
| GET | `/api/v1/analytics/admin/searches` | ADMIN | Top search queries |
| GET | `/api/v1/analytics/admin/settings` | ADMIN | Platform settings |
| POST | `/api/v1/analytics/admin/settings` | ADMIN | Save platform settings |

### Referrals

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/referrals/code` | Bearer | Get own referral code |
| GET | `/api/v1/referrals/stats` | Bearer | Referral earnings & history |
| GET | `/api/v1/referrals/wallet` | Bearer | Wallet balance |

### Delivery — delivery-service :8013

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/delivery/:orderId` | Bearer | Delivery status & location |
| PUT | `/api/v1/delivery/:id/assign` | ADMIN | Assign driver |
| PUT | `/api/v1/delivery/:id/status` | DELIVERY | Update delivery status |
| GET | `/api/v1/delivery/driver/tasks` | DELIVERY | Driver's task list |

**Socket.io events (delivery-service :8013):**

| Event | Direction | Payload |
|-------|-----------|---------|
| `join-delivery` | client → server | `{ orderId }` |
| `location-update` | DELIVERY → server | `{ lat, lng, orderId }` |
| `delivery-location` | server → client | `{ lat, lng, timestamp }` |
| `delivery-status` | server → client | `{ status }` |

---

## Payment Gateways

All gateway logic lives in `services/api-monolith/src/modules/payments/`.

### Khalti

```
POST /api/v1/payments/initiate  { gateway: "KHALTI", orderId, amount, returnUrl? }
  → returns { redirect: "https://test-pay.khalti.com/?pidx=...", pidx, expires_at }
User pays → Khalti redirects → GET /api/v1/payments/khalti/callback?pidx=...
  → server calls Khalti lookup API → fires payment:success or payment:failed on InternalBus
  → Kafka: payment.success or payment.failed → notification-service
```

**Test credentials:** ID `9800000001`, MPIN `1111`, OTP `987654`

### eSewa

```
POST /api/v1/payments/initiate  { gateway: "ESEWA", orderId, amount }
  → returns { formUrl, esewaData: { ...fields, signature } }
Frontend submits HTML form to formUrl
  → GET /api/v1/payments/esewa/callback?data=<base64-json>
  → server verifies HMAC-SHA256 signature + calls status API
```

**Test credentials:** ID `9806800001`, Password `Nepal@123`, MPIN `1122`, OTP `123456`

**Env vars:** `ESEWA_SECRET_KEY`, `ESEWA_MERCHANT_CODE`, `API_BASE_URL`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand, TanStack Query |
| Mobile | Flutter 3 (Dart) — 4 apps |
| API Gateway | Kong (declarative config) |
| Backend | Node.js 20, Express.js, TypeScript (strict) |
| Architecture | Modular Monolith — 13 modules, single process |
| Validation | Zod (all module boundaries) |
| Database | MongoDB 7 — single `bazzar_monolith` cluster |
| Cache | Redis 7 — cart store + rate limiting |
| Internal Events | Node.js EventEmitter (typed InternalBus) |
| External Events | Apache Kafka (KafkaJS) — delivery + notifications only |
| Real-time | Socket.io — delivery GPS tracking (delivery-service) |
| Auth | JWT — access (15m) + refresh (30d) |
| File Storage | AWS S3 (product images + storefronts) |
| CDN | AWS CloudFront |
| Nepal Payments | Khalti, eSewa, Fonepay |
| Email | SendGrid |
| SMS | Sparrow SMS (Nepal) |
| Push | Firebase Cloud Messaging |
| Containers | Docker, Docker Compose |
| Orchestration | AWS EKS (Kubernetes) |
| IaC | Terraform |
| CI/CD | GitHub Actions → ECR → EKS |
| Monitoring | Prometheus + Grafana |
| Logging | Winston → CloudWatch |

---

## Mobile Apps

| App | Directory | Role |
|-----|-----------|------|
| Buyer App | `mobile/buyer_app/` | BUYER |
| Seller App | `mobile/seller_app/` | SELLER |
| Admin App | `mobile/admin_app/` | ADMIN |
| Delivery App | `mobile/delivery_app/` | DELIVERY |

All apps point to Kong gateway and use the same JWT auth flow. Base URL: `NEXT_PUBLIC_API_BASE_URL` / Kong gateway host.

---

## Deployment

### Local Dev — Docker Compose

```bash
cp .env.example .env
docker-compose up -d
# api-monolith: http://localhost:8100
# web: http://localhost:3000
```

### Production — AWS EKS

```bash
# 1. Provision infrastructure
cd infrastructure/terraform && terraform init && terraform apply

# 2. Connect kubectl
aws eks update-kubeconfig --name bazzar-eks --region ap-south-1

# 3. Apply manifests
kubectl apply -f infrastructure/k8s/

# 4. Sync Kong routes
deck sync --state infrastructure/kong/kong.yml
```

CI/CD: push to `main` → GitHub Actions → Docker image → ECR → rolling EKS deploy.

---

## Project Structure

```
bazzar-mart/
├── services/
│   ├── api-monolith/              # Main backend — 13 modules, port 8100
│   │   └── src/
│   │       ├── modules/           # users · products · cart · orders · payments
│   │       │                      # sellers · reviews · referrals · support
│   │       │                      # storefront · search · recommendations · analytics
│   │       ├── shared/            # auth middleware, InternalBus, error handlers
│   │       ├── config/            # env, db, redis
│   │       ├── kafka/             # single producer + consumers
│   │       ├── app.ts
│   │       └── server.ts
│   ├── delivery-service/          # Port 8013 — GPS tracking, Socket.io
│   └── notification-service/      # Port 8008 — email/SMS/push via Kafka
├── web/                           # Next.js 14 frontend (port 3000)
├── mobile/
│   ├── buyer_app/                 # Flutter
│   ├── seller_app/                # Flutter
│   ├── admin_app/                 # Flutter
│   └── delivery_app/              # Flutter
├── packages/
│   └── shared/                    # @bazzar/shared — types, errors
├── infrastructure/
│   ├── k8s/                       # 3 Kubernetes deployments (monolith + delivery + notifications)
│   ├── terraform/                 # AWS EKS, MSK, ElastiCache, MongoDB Atlas
│   ├── kong/                      # API gateway config
│   └── github-actions/            # CI/CD
├── docs/                          # Architecture and spec documents
├── docker-compose.yml
└── .env.example
```

---

## Test Accounts

- **Buyer** — default role on registration
- **Seller** — register, then apply at `/api/v1/seller/register` (requires admin approval)
- **Admin** — set manually in MongoDB: `db.users.updateOne({email:'...'}, {$set:{role:'ADMIN'}})`

**Coupon code:** `BAZZAR10` (10% discount at checkout)
