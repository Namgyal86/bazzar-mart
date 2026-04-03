# Bazzar — Nepal's Multi-Vendor E-Commerce Platform

A production-ready microservices e-commerce platform built for Nepal, supporting multiple vendors, payment gateways (Khalti, eSewa, Fonepay), real-time delivery tracking, and 4 client apps.

---

## Table of Contents

- [Architecture](#architecture)
- [Services](#services)
- [Kafka Event Flow](#kafka-event-flow)
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
┌─────────────────────────────────────────────────────┐
│                      CLIENTS                        │
│  Next.js Web :3000  │  Flutter Buyer / Seller /     │
│  (Buyer+Seller+Admin│  Admin / Delivery Apps        │
└────────────┬────────┴────────────────┬──────────────┘
             │                         │
             ▼                         ▼
┌────────────────────────────────────────────────────┐
│              Kong API Gateway                      │
│   JWT auth · Rate limiting · CORS · Routing        │
└──────────────────────┬─────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  REST (sync)     Kafka (async)   Socket.io
        │              │          (delivery)
        ▼              ▼
┌───────────────────────────────────────────────────┐
│               14 Microservices                    │
│  Node.js · Express · TypeScript · Zod · JWT       │
└───────────────────────────────────────────────────┘
        │              │              │
        ▼              ▼              ▼
   MongoDB ×12      Redis 7     Elasticsearch 8
```

**Communication patterns:**
1. **Client → Kong → Service** — all user-facing HTTP requests
2. **REST (sync)** — when a service needs an immediate response from another
3. **Kafka (async)** — fire-and-forget domain events between services

---

## Services

| Service | Port | DB | Status |
|---------|------|----|--------|
| user-service | 8001 | user_db | Done |
| product-service | 8002 | product_db | Done |
| cart-service | 8003 | Redis only | Done |
| order-service | 8004 | order_db | Done |
| payment-service | 8005 | payment_db | Done |
| review-service | 8006 | review_db | Done |
| seller-service | 8007 | seller_db | Done |
| notification-service | 8008 | notification_db | Done (providers pending) |
| search-service | 8009 | Elasticsearch | Proxy (ES not wired) |
| recommendation-service | 8010 | recommendation_db | Done |
| storefront-designer-service | 8011 | storefront_db | Stub |
| referral-service | 8012 | referral_db | Done |
| delivery-service | 8013 | delivery_db | Done |
| analytics-service | 8014 | analytics_db | Done |

### Service Responsibilities

**user-service** — Registration, login, JWT access/refresh tokens, OTP phone verification, address book, Kafka: `user.registered`

**product-service** — Product CRUD, category management, S3 image uploads, Redis cache, Kafka: `product.created`

**cart-service** — Redis-backed cart with 30-day TTL, in-memory fallback when Redis is down, Kafka: `cart.updated`, `cart.cleared`

**order-service** — Order lifecycle (PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED), coupon validation, Kafka: `order.created`, `order.confirmed`

**payment-service** — Khalti, eSewa, Fonepay, COD. Webhook verification. Kafka: `payment.success`, `payment.failed`, `payment.refunded`

**review-service** — Product reviews and star ratings with seller aggregate updates. Kafka: `review.posted`

**seller-service** — Seller onboarding, approval flow, payout queue (90% of order value). Kafka: consumes `payment.success`, `seller.approved`

**notification-service** — In-app + email (SendGrid) + SMS (Sparrow SMS) + push (Firebase FCM). Consumes all major domain events.

**search-service** — Full-text product search (proxies product-service; Elasticsearch integration pending)

**recommendation-service** — Personalized product recommendations based on order history and review signals. Consumes `order.created`, `review.posted`, `product.created`

**storefront-designer-service** — Custom Handlebars-based seller storefronts with S3/CDN hosting (stub)

**referral-service** — Referral codes, Rs. 200 wallet credit for referrer + new user on first order. Consumes `user.registered`, `order.created`

**delivery-service** — Driver assignment, real-time GPS tracking via Socket.io, delivery task lifecycle. Kafka: `delivery.completed`

**analytics-service** — Platform-wide analytics and admin dashboards. Consumes `order.created`, `payment.success`, `user.registered`, `delivery.completed`

---

## Kafka Event Flow

```
user.registered      → notification-service (welcome email/SMS)
                     → referral-service (record referral code)

product.created      → recommendation-service (update index)

order.created        → notification-service (order confirmation)
                     → analytics-service
                     → referral-service (first-order auto-reward)

payment.success      → order-service (CONFIRMED)
                     → seller-service (90% payout queue)
                     → notification-service

payment.failed       → order-service (PAYMENT_FAILED)
                     → notification-service

order.confirmed      → delivery-service (create DeliveryTask)

delivery.completed   → order-service (DELIVERED)
                     → notification-service
                     → analytics-service

review.posted        → recommendation-service (update signals)

seller.approved      → seller-service (activate account)
                     → notification-service

cart.updated         → (available for future recommendations)
cart.cleared         → (available for abandoned cart flows)
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 7 (local or Atlas)
- Redis 7 (local or Upstash)
- Kafka (local or Confluent Cloud)

### 1. Clone & Install

```bash
git clone https://github.com/Namgyal86/bazzar-mart.git
cd bazzar-mart
npm install   # installs root + all workspaces
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your MongoDB URI, Redis URL, JWT secrets, Kafka brokers, and payment keys
```

### 3. Start All Services (Windows)

```bat
start-services.bat
```

### 3. Start All Services (Mac/Linux)

```bash
chmod +x start-services.sh && ./start-services.sh
```

### 4. Start Frontend

```bash
cd web && npm run dev
# http://localhost:3000
```

---

## Docker Compose (Recommended)

```bash
# Copy and fill in secrets
cp .env.example .env

# Start everything (MongoDB, Redis, Kafka, Elasticsearch + all 14 services + web)
docker-compose up -d

# Follow logs for a specific service
docker-compose logs -f cart-service

# Stop everything
docker-compose down
```

Minimum specs: **16 GB RAM, 8 CPU cores**.

---

## Environment Variables

Each service reads its config from environment variables validated by Zod at startup (crash-fast on missing required vars).

| Variable | Used by | Description |
|----------|---------|-------------|
| `MONGO_URI` | most services | MongoDB connection string |
| `REDIS_URL` | cart, product, search | `redis://host:6379` |
| `JWT_ACCESS_SECRET` | all services | Sign/verify access tokens |
| `JWT_REFRESH_SECRET` | user-service | Sign/verify refresh tokens |
| `KAFKA_BROKERS` | all services | Comma-separated broker list |
| `PORT` | each service | Overrides default port |
| `KHALTI_SECRET_KEY` | payment-service | Khalti secret key (test: from Khalti merchant dashboard) |
| `ESEWA_SECRET_KEY` | payment-service | eSewa HMAC secret (test: `8gBm/:&EnhH.1/q(`) |
| `ESEWA_MERCHANT_CODE` | payment-service | eSewa merchant code (test: `EPAYTEST`) |
| `API_BASE_URL` | payment-service | Public URL of payment-service (used in eSewa success_url) |
| `SENDGRID_API_KEY` | notification-service | Transactional email |
| `SPARROW_SMS_TOKEN` | notification-service | Nepal SMS gateway |
| `FIREBASE_SERVICE_ACCOUNT` | notification-service | FCM push notifications |
| `AWS_BUCKET_NAME` | product-service | S3 product image uploads |

---

## API Reference

All routes are prefixed `/api/v1/` and go through Kong API Gateway.

### Auth / Users — user-service :8001

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register new user |
| POST | `/api/v1/auth/login` | — | Login, returns JWT pair |
| POST | `/api/v1/auth/refresh` | — | Refresh access token |
| POST | `/api/v1/auth/logout` | Bearer | Revoke refresh token |
| POST | `/api/v1/auth/send-otp` | — | Send OTP to phone |
| POST | `/api/v1/auth/verify-otp` | — | Verify OTP |
| GET | `/api/v1/users/me` | Bearer | Get own profile |
| PUT | `/api/v1/users/me` | Bearer | Update profile |
| GET | `/api/v1/users/addresses` | Bearer | List addresses |
| POST | `/api/v1/users/addresses` | Bearer | Add address |
| PUT | `/api/v1/users/addresses/:id` | Bearer | Update address |
| DELETE | `/api/v1/users/addresses/:id` | Bearer | Delete address |

### Products — product-service :8002

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/products` | — | List products (filter/sort/page) |
| GET | `/api/v1/products/:id` | — | Get product detail |
| POST | `/api/v1/products` | SELLER | Create product |
| PUT | `/api/v1/products/:id` | SELLER | Update product |
| DELETE | `/api/v1/products/:id` | SELLER | Delete product |
| POST | `/api/v1/products/:id/images` | SELLER | Upload images (S3) |
| GET | `/api/v1/categories` | — | List categories |
| POST | `/api/v1/categories` | ADMIN | Create category |

### Cart — cart-service :8003

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/cart` | Bearer | Get cart with total |
| POST | `/api/v1/cart/items` | Bearer | Add item |
| PUT | `/api/v1/cart/items/:productId` | Bearer | Update quantity |
| PATCH | `/api/v1/cart/items/:productId` | Bearer | Update quantity (alias) |
| DELETE | `/api/v1/cart/items/:productId` | Bearer | Remove item |
| DELETE | `/api/v1/cart` | Bearer | Clear cart |

### Orders — order-service :8004

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/orders` | Bearer | Place order |
| GET | `/api/v1/orders` | Bearer | List own orders |
| GET | `/api/v1/orders/:id` | Bearer | Order detail |
| PUT | `/api/v1/orders/:id/cancel` | Bearer | Cancel order |
| GET | `/api/v1/orders/seller` | SELLER | Seller's orders |
| PUT | `/api/v1/orders/:id/status` | SELLER | Update status |
| GET | `/api/v1/orders/admin` | ADMIN | All orders |

### Payments — payment-service :8005

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/payments/initiate` | Bearer | Initiate payment — returns gateway-specific payload |
| GET | `/api/v1/payments/khalti/callback` | — | Khalti browser redirect handler (set as `return_url`) |
| GET | `/api/v1/payments/esewa/callback` | — | eSewa browser redirect handler (set as `success_url`) |
| POST | `/api/v1/payments/khalti/verify` | Bearer | Manual Khalti lookup (fallback) |
| POST | `/api/v1/payments/esewa/verify` | Bearer | Manual eSewa status check (fallback) |
| POST | `/api/v1/payments/fonepay/verify` | Bearer | Confirm Fonepay payment |
| POST | `/api/v1/payments/verify` | Bearer | Generic verify (pass `gateway` in body) |
| GET | `/api/v1/payments/order/:orderId` | Bearer | Get payment record by order |
| GET | `/api/v1/payments/admin/list` | ADMIN | Paginated payment list |

### Reviews — review-service :8006

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/reviews/product/:productId` | — | Product reviews |
| POST | `/api/v1/reviews` | Bearer | Post review (verified purchase) |
| PUT | `/api/v1/reviews/:id` | Bearer | Edit own review |
| DELETE | `/api/v1/reviews/:id` | Bearer | Delete own review |

### Seller — seller-service :8007

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/seller/register` | Bearer | Seller application |
| GET | `/api/v1/seller/profile` | SELLER | Seller profile |
| PUT | `/api/v1/seller/profile` | SELLER | Update profile |
| GET | `/api/v1/seller/dashboard` | SELLER | Revenue, orders, payout stats |
| GET | `/api/v1/seller/payouts` | SELLER | Payout history |
| GET | `/api/v1/seller/pending` | ADMIN | Pending applications |
| PUT | `/api/v1/seller/:id/approve` | ADMIN | Approve seller |

### Notifications — notification-service :8008

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/notifications` | Bearer | List own notifications |
| PUT | `/api/v1/notifications/:id/read` | Bearer | Mark read |
| PUT | `/api/v1/notifications/read-all` | Bearer | Mark all read |
| DELETE | `/api/v1/notifications/:id` | Bearer | Delete notification |

### Search — search-service :8009

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/search?q=term` | — | Full-text product search |
| GET | `/api/v1/search/suggestions?q=term` | — | Autocomplete suggestions |

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
| `location-update` | DELIVERY app → server | `{ lat, lng, orderId }` |
| `delivery-location` | server → client | `{ lat, lng, timestamp }` |
| `delivery-status` | server → client | `{ status }` |

### Analytics — analytics-service :8014

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/analytics/summary` | ADMIN | Platform overview stats |
| GET | `/api/v1/analytics/revenue` | ADMIN | Revenue over time |
| GET | `/api/v1/analytics/orders` | ADMIN | Order volume over time |
| GET | `/api/v1/analytics/users` | ADMIN | New user registrations |

### Referrals — referral-service :8012

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/referrals/code` | Bearer | Get own referral code |
| GET | `/api/v1/referrals/stats` | Bearer | Referral earnings & history |

---

## Payment Gateways

Bazzar supports three Nepal-native payment gateways plus Cash on Delivery. All gateway logic lives in `services/payment-service/src/services/`.

---

### Khalti

**Docs:** https://docs.khalti.com/khalti-epayment/

#### Endpoints

| Environment | URL |
|-------------|-----|
| Sandbox | `https://dev.khalti.com/api/v2` |
| Production | `https://khalti.com/api/v2` |

#### Flow

```
1. POST /api/v1/payments/initiate  { gateway: "KHALTI", orderId, amount, returnUrl? }
        ↓ payment-service calls khalti /epayment/initiate/
        ↓ returns { redirect: "https://test-pay.khalti.com/?pidx=...", pidx, expires_at }
2. Frontend redirects user to payment_url
3. User pays on Khalti portal
4. Khalti redirects to GET /api/v1/payments/khalti/callback?pidx=...&purchase_order_id=...
        ↓ payment-service calls khalti /epayment/lookup/  (server-side — never trusts query params)
        ↓ if status === "Completed" → marks SUCCESS → fires Kafka payment.success
        ↓ else → marks FAILED → fires Kafka payment.failed
        ↓ redirects browser to /payment/success or /payment/failed
```

#### Request — Initiate

```json
POST /api/v1/payments/initiate
Authorization: Bearer <token>

{
  "orderId": "order_abc123",
  "amount": 500,
  "gateway": "KHALTI",
  "returnUrl": "https://yourdomain.com/payment/verify",
  "customerInfo": {
    "name": "Ram Bahadur",
    "email": "ram@example.com",
    "phone": "9800000001"
  }
}
```

#### Response — Initiate

```json
{
  "success": true,
  "data": {
    "payment": { "_id": "...", "status": "INITIATED", "gateway": "KHALTI", ... },
    "redirect": "https://test-pay.khalti.com/?pidx=bZcoazBTPECJiKNpBjXtrK",
    "pidx": "bZcoazBTPECJiKNpBjXtrK",
    "expires_at": "2025-01-01T12:30:00Z",
    "method": "KHALTI"
  }
}
```

#### Khalti Payment Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| `Completed` | Payment successful | Fulfil order |
| `Pending` | Processing | Hold — contact Khalti |
| `Initiated` | Not yet paid | Hold |
| `Refunded` | Full refund | Do not fulfil |
| `User canceled` | User aborted | Reject |
| `Expired` | Link expired (60 min) | Reject |
| `Partially Refunded` | Partial refund | Handle separately |

#### Environment Variables

```env
KHALTI_SECRET_KEY=your_live_secret_key_here
```

#### Test Credentials (Sandbox)

| Field | Value |
|-------|-------|
| Khalti ID | `9800000000` to `9800000005` |
| MPIN | `1111` |
| OTP | `987654` |

> Note: E-banking and debit/credit card not supported in sandbox.

---

### eSewa

**Docs:** https://developer.esewa.com.np/pages/Epay

#### Endpoints

| Environment | Form URL | Status Check |
|-------------|----------|--------------|
| Sandbox | `https://rc-epay.esewa.com.np/api/epay/main/v2/form` | `https://rc.esewa.com.np/api/epay/transaction/status/` |
| Production | `https://epay.esewa.com.np/api/epay/main/v2/form` | `https://esewa.com.np/api/epay/transaction/status/` |

#### Flow

```
1. POST /api/v1/payments/initiate  { gateway: "ESEWA", orderId, amount }
        ↓ payment-service generates HMAC-SHA256 signature
        ↓ returns { esewaData: { ...fields, signature }, formUrl }
2. Frontend submits HTML form (POST) with esewaData to formUrl
3. User pays on eSewa portal
4. eSewa redirects to GET /api/v1/payments/esewa/callback?data=<base64-json>
        ↓ payment-service decodes Base64 JSON
        ↓ verifies response signature (HMAC-SHA256 over signed_field_names)
        ↓ calls status check API to confirm (server-side — never trusts callback alone)
        ↓ if status === "COMPLETE" → marks SUCCESS → fires Kafka payment.success
        ↓ else → marks FAILED → fires Kafka payment.failed
        ↓ redirects browser to /payment/success or /payment/failed
```

#### Request — Initiate

```json
POST /api/v1/payments/initiate
Authorization: Bearer <token>

{
  "orderId": "order_abc123",
  "amount": 500,
  "gateway": "ESEWA"
}
```

#### Response — Initiate

```json
{
  "success": true,
  "data": {
    "payment": { "_id": "...", "status": "INITIATED", "gateway": "ESEWA", ... },
    "formUrl": "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    "esewaData": {
      "amount": 500,
      "tax_amount": 0,
      "product_service_charge": 0,
      "product_delivery_charge": 0,
      "total_amount": 500,
      "transaction_uuid": "6789abcdef0123456789abcd",
      "product_code": "EPAYTEST",
      "success_url": "https://your-api/api/v1/payments/esewa/callback",
      "failure_url": "http://localhost:3000/payment/failed",
      "signed_field_names": "total_amount,transaction_uuid,product_code",
      "signature": "4Ov7pCI1zIOdwtV2BRMUNjz1upIlT/COTxfLhWvVurE="
    },
    "method": "ESEWA"
  }
}
```

#### Signature Generation

eSewa uses HMAC-SHA256 over a specific message string, then Base64-encodes the result.

```
message = "total_amount=500,transaction_uuid=<id>,product_code=EPAYTEST"
signature = Base64( HMAC-SHA256(message, secret_key) )
```

Both the outgoing form POST and the incoming callback response are verified this way.

#### eSewa Transaction Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| `COMPLETE` | Payment successful | Fulfil order |
| `PENDING` | Initiated, not completed | Hold |
| `FULL_REFUND` | Full refund issued | Do not fulfil |
| `PARTIAL_REFUND` | Partial refund | Handle separately |
| `AMBIGUOUS` | Uncertain state | Contact eSewa |
| `NOT_FOUND` | Session expired | Reject |
| `CANCELED` | Reversed by eSewa | Reject |

#### Environment Variables

```env
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q(       # UAT default — replace for production
ESEWA_MERCHANT_CODE=EPAYTEST             # UAT default — replace for production
API_BASE_URL=http://localhost:8005       # Public URL of payment-service
```

#### Test Credentials (Sandbox)

| Field | Value |
|-------|-------|
| eSewa ID | `9806800001` to `9806800005` |
| Password | `Nepal@123` |
| MPIN | `1122` |
| OTP | `123456` |

#### Frontend Integration (HTML Form)

```html
<form method="POST" action="<formUrl>">
  <input type="hidden" name="amount"                  value="<esewaData.amount>" />
  <input type="hidden" name="tax_amount"              value="<esewaData.tax_amount>" />
  <input type="hidden" name="product_service_charge"  value="<esewaData.product_service_charge>" />
  <input type="hidden" name="product_delivery_charge" value="<esewaData.product_delivery_charge>" />
  <input type="hidden" name="total_amount"            value="<esewaData.total_amount>" />
  <input type="hidden" name="transaction_uuid"        value="<esewaData.transaction_uuid>" />
  <input type="hidden" name="product_code"            value="<esewaData.product_code>" />
  <input type="hidden" name="success_url"             value="<esewaData.success_url>" />
  <input type="hidden" name="failure_url"             value="<esewaData.failure_url>" />
  <input type="hidden" name="signed_field_names"      value="<esewaData.signed_field_names>" />
  <input type="hidden" name="signature"               value="<esewaData.signature>" />
  <button type="submit">Pay with eSewa</button>
</form>
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| Mobile | Flutter 3 (Dart) — 4 apps |
| API Gateway | Kong (declarative config) |
| Backend | Node.js 18, Express, TypeScript (strict) |
| Validation | Zod (all service boundaries) |
| Database | MongoDB 7 — one isolated DB per service |
| Cache | Redis 7 — cart (30d TTL), product cache (2-5min) |
| Message Bus | Apache Kafka (KafkaJS) |
| Search | Elasticsearch 8 |
| Real-time | Socket.io (delivery GPS tracking) |
| Auth | JWT — access (15m) + refresh (30d) with rotation |
| File Storage | AWS S3 (product images) |
| Charts | Recharts (web dashboards) |
| Containerization | Docker, Docker Compose |
| Orchestration | AWS EKS (Kubernetes) |
| Infrastructure as Code | Terraform |
| CI/CD | GitHub Actions → ECR → EKS |
| Nepal Payments | Khalti, eSewa, Fonepay |
| Email | SendGrid |
| SMS | Sparrow SMS (Nepal) |
| Push | Firebase Cloud Messaging |

---

## Mobile Apps

Located in `mobile/`:

| App | Directory | Actors |
|-----|-----------|--------|
| Buyer App | `mobile/buyer_app/` | BUYER |
| Seller App | `mobile/seller_app/` | SELLER |
| Admin App | `mobile/admin_app/` | ADMIN |
| Delivery App | `mobile/delivery_app/` | DELIVERY |

All apps share the same base API URL (Kong gateway) and use the same JWT auth flow.

---

## Deployment

### Local Dev — Docker Compose

```bash
cp .env.example .env
docker-compose up -d
```

### Production — AWS EKS

```bash
# 1. Provision infrastructure
cd infrastructure/terraform
terraform init && terraform apply
# Creates: EKS cluster, MSK Kafka, ElastiCache Redis, DocumentDB

# 2. Connect kubectl
aws eks update-kubeconfig --name bazzar-eks --region ap-south-1

# 3. Apply Kubernetes manifests
kubectl apply -f infrastructure/k8s/namespace.yaml
kubectl apply -f infrastructure/k8s/configmap.yaml
kubectl apply -f infrastructure/k8s/services/
kubectl apply -f infrastructure/k8s/ingress.yaml

# 4. Sync Kong routes
deck sync --state infrastructure/kong/kong.yml
```

CI/CD: every push to `main` triggers GitHub Actions → builds Docker images → pushes to ECR → rolls out to EKS.

### Budget Deploy (Railway / Render)

Deploy each service individually with:
- **MongoDB Atlas** (free M0 cluster per service)
- **Upstash Redis** (free tier)
- **Confluent Cloud** (free Kafka tier)

---

## Project Structure

```
bazzar-mart/
├── services/                  # 14 Node.js microservices
│   ├── user-service/
│   ├── product-service/
│   ├── cart-service/
│   └── ...
├── web/                       # Next.js 14 frontend
├── mobile/                    # 4 Flutter apps
│   ├── buyer_app/
│   ├── seller_app/
│   ├── admin_app/
│   └── delivery_app/
├── packages/
│   └── shared/                # @bazzar/shared — types, middleware, Kafka factory
├── infrastructure/
│   ├── k8s/                   # Kubernetes manifests
│   ├── terraform/             # AWS infrastructure
│   ├── kong/                  # API gateway config
│   └── github-actions/        # CI/CD workflows
├── docs/                      # Detailed spec documents
├── docker-compose.yml
└── .env.example
```

---

## Service File Pattern

Every service follows this structure:

```
{service}/src/
├── config/
│   ├── env.ts          # Zod-validated env — crashes on missing vars
│   ├── db.ts           # Mongoose connect (if MongoDB)
│   └── redis.ts        # ioredis client (if Redis)
├── models/             # Mongoose schemas + TS interfaces
├── repositories/       # DB queries only — no business logic
├── services/           # Business logic — no req/res objects
├── controllers/        # Thin: validate → service → respond
├── routes/             # Express routers
├── middleware/
│   ├── auth.middleware.ts
│   └── validation.ts   # Zod request schemas
├── kafka/
│   ├── producer.ts
│   └── consumers/
├── app.ts              # Express factory (no listen)
└── index.ts            # Entry: listen + Kafka connect
```

**Response envelope used by all services:**
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": { "page": 1, "total": 100 }
}
```

---

## Test Accounts

Register at `/auth/register` and use role-based flows:
- **Buyer** — default role on registration
- **Seller** — register then apply at `/sellers/register` (requires admin approval)
- **Delivery** — assigned by admin

**Coupon code:** `BAZZAR10` (10% discount at checkout)
