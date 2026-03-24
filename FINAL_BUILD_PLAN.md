# Bazzar — Final Build Plan
> Generated: 2026-03-20 | Status: IN PROGRESS

---

## Project Summary

**Bazzar** is a full multi-vendor e-commerce marketplace (Nepal-focused) with:
- 14 Node.js/Express/TypeScript microservices
- Next.js 14 web frontend (buyer + seller + admin dashboards)
- 4 Flutter mobile apps (Buyer, Seller, Admin, Delivery Guy)
- MongoDB 7 (one DB per service), Redis 7, Kafka, Elasticsearch 8
- Nepal payment gateways: Khalti, eSewa, Fonepay + Stripe, Razorpay, COD
- Real-time GPS delivery tracking via Socket.io
- Kong API Gateway, AWS EKS, Terraform, GitHub Actions CI/CD

---

## Monorepo Root Structure

```
ecommerce-platform/
├── packages/
│   └── shared/                    # Shared TypeScript package (npm workspace)
│       ├── src/
│       │   ├── types/             # API envelope, JWT payload, Kafka events
│       │   ├── errors/            # AppError hierarchy
│       │   ├── middleware/        # auth, errorHandler, validate
│       │   ├── kafka/             # producer + consumer factories
│       │   ├── redis/             # ioredis client factory
│       │   └── logger/            # Winston factory
│       ├── package.json
│       └── tsconfig.json
│
├── services/
│   ├── user-service/              # Port 8001 | DB: user_db
│   ├── product-service/           # Port 8002 | DB: product_db
│   ├── cart-service/              # Port 8003 | DB: Redis only
│   ├── order-service/             # Port 8004 | DB: order_db
│   ├── payment-service/           # Port 8005 | DB: payment_db
│   ├── review-service/            # Port 8006 | DB: review_db
│   ├── seller-service/            # Port 8007 | DB: seller_db
│   ├── notification-service/      # Port 8008 | DB: notification_db
│   ├── search-service/            # Port 8009 | DB: Elasticsearch
│   ├── recommendation-service/    # Port 8010 | DB: recommendation_db
│   ├── storefront-designer-service/ # Port 8011 | DB: storefront_db
│   ├── referral-service/          # Port 8012 | DB: referral_db
│   ├── delivery-service/          # Port 8013 | DB: delivery_db + Socket.io
│   └── analytics-service/         # Port 8014 | DB: analytics_db
│
├── web/                           # Next.js 14 (Buyer + Seller/Admin dashboards)
│
├── mobile/
│   ├── buyer_app/                 # Flutter (iOS + Android)
│   ├── seller_app/                # Flutter (iOS + Android)
│   ├── admin_app/                 # Flutter (iOS + Android)
│   └── delivery_app/              # Flutter (iOS + Android)
│
├── infrastructure/
│   ├── k8s/                       # Kubernetes manifests
│   ├── terraform/                 # AWS EKS, RDS, MSK, ElastiCache
│   ├── kong/                      # kong.yml declarative config
│   └── github-actions/            # CI/CD workflows
│
├── docker-compose.yml             # Full local dev environment
├── package.json                   # npm workspaces root
├── tsconfig.base.json             # Shared TS config
├── .env.example                   # All required env vars
└── .gitignore
```

---

## Service Directory Pattern (Every Service)

```
{service}/
├── src/
│   ├── config/
│   │   ├── env.ts         # Zod-validated env (crash on missing)
│   │   ├── db.ts          # Mongoose connect
│   │   └── redis.ts       # ioredis client
│   ├── models/            # Mongoose schemas + TS interfaces
│   ├── repositories/      # DB queries only — no logic
│   ├── services/          # Business logic — no req/res
│   ├── controllers/       # Thin: validate → service → respond
│   ├── routes/            # Express routers
│   ├── middleware/        # validation.ts (Zod schemas)
│   ├── kafka/
│   │   ├── producer.ts
│   │   └── consumers/
│   ├── jobs/              # BullMQ workers
│   ├── app.ts             # Express factory (no listen)
│   └── server.ts          # Entry: listen + DB + Kafka connect
├── tests/unit/
├── tests/integration/
├── Dockerfile             # Multi-stage build
├── package.json
└── tsconfig.json
```

---

## Build Phases

| Phase | Component | Port | Status |
|-------|-----------|------|--------|
| 1 | Foundation + Shared Packages + Docker Compose | — | ✅ Done |
| 2 | User Service | 8001 | ✅ Done |
| 3 | Product Service | 8002 | ✅ Done |
| 4 | Cart Service | 8003 | ✅ Done |
| 5 | Order Service | 8004 | ✅ Done |
| 6 | Payment Service (Khalti/eSewa/Fonepay/Stripe/COD) | 8005 | ✅ Done |
| 7 | Review Service | 8006 | ✅ Done |
| 8 | Seller Service | 8007 | ✅ Done |
| 9 | Notification Service (SendGrid/Sparrow SMS/FCM) | 8008 | ✅ Done |
| 10 | Search Service (Elasticsearch) | 8009 | ✅ Done |
| 11 | Delivery Service (Socket.io + GPS) | 8013 | ✅ Done |
| 12 | Recommendation Service | 8010 | ✅ Done |
| 13 | Analytics Service | 8014 | ✅ Done |
| 14 | Storefront Designer Service | 8011 | ✅ Done |
| 15 | Referral Service | 8012 | ✅ Done |
| 16 | Kong API Gateway | — | ✅ Done |
| 17 | Next.js Web Frontend | 3000 | ✅ Done |
| 18 | Infrastructure (K8s + Terraform + CI/CD) | — | ✅ Done |

> **Note:** Status above reflects plan targets. Check individual service directories for actual completion.

---

## Architecture Rules (Non-Negotiable)

1. Every service has its **own isolated MongoDB** — zero cross-DB reads
2. Inter-service communication: **REST (sync)** + **Kafka (async)**
3. Every service exposes `GET /health` and `GET /metrics`
4. Secrets from **environment variables only** — never hardcoded
5. JWT roles: `BUYER | SELLER | ADMIN | DELIVERY` enforced via middleware
6. Standard response envelope: `{ success, data, error, meta? }`
7. Zod validation on **all** inputs at every service boundary
8. TypeScript strict mode — no `any`, no `@ts-ignore`

---

## Four Actors

| Actor | Flutter App | JWT Role | Key Services |
|-------|------------|----------|-------------|
| Buyer | buyer_app | BUYER | User, Product, Cart, Order, Payment, Review, Referral, Delivery (track) |
| Seller | seller_app | SELLER | Seller, Product, Order, Storefront |
| Admin | admin_app | ADMIN | All services (admin endpoints) |
| Delivery Guy | delivery_app | DELIVERY | Delivery Service (HTTP + Socket.io) |

---

## Kafka Topics

| Topic | Producer | Consumers |
|-------|----------|-----------|
| `user.registered` | User Svc | Notification Svc |
| `product.created` | Product Svc | Search Svc, Recommendation Svc |
| `inventory.updated` | Product Svc | Search Svc, Notification Svc |
| `order.created` | Order Svc | Payment Svc, Notification Svc, Analytics |
| `order.confirmed` | Order Svc | Delivery Svc, Notification Svc |
| `order.cancelled` | Order Svc | Delivery Svc, Notification Svc |
| `payment.success` | Payment Svc | Order Svc, Notification Svc, Seller Svc |
| `payment.failed` | Payment Svc | Order Svc, Notification Svc |
| `review.posted` | Review Svc | Recommendation Svc |
| `delivery.assigned` | Delivery Svc | Notification Svc |
| `delivery.completed` | Delivery Svc | Order Svc, Notification Svc, Analytics |
| `referral.reward_issued` | Referral Svc | Notification Svc |
| `storefront.published` | Storefront Svc | CDN invalidation |

---

## Payment Gateways (Nepal-Focused)

| Gateway | Type | Integration |
|---------|------|-------------|
| Khalti | Nepal digital wallet | ePay API + HMAC webhook |
| eSewa | Nepal digital wallet | Form-field signature + redirect verify |
| Fonepay | Nepal bank QR | MD5 signed initiate + QR + verify |
| Stripe | International cards | PaymentIntent + webhook |
| Razorpay | India UPI | Order create + HMAC verify |
| COD | Cash on delivery | No gateway — status flow only |

---

## Redis Caching TTLs

| Data | TTL |
|------|-----|
| Product detail | 2 min |
| Product listing | 5 min |
| Cart (primary store) | 7 days |
| Save-for-later | 30 days |
| Search results | 1 min |
| Seller analytics | 10 min |
| Referral config | 5 min |
| OTP (password reset) | 5 min |

---

## Socket.io Events (Delivery Service — Port 8013)

| Event | Direction | Actor | Payload |
|-------|-----------|-------|---------|
| `track:join` | Client→Server | BUYER | `{ orderId }` |
| `delivery:location_update` | Client→Server | DELIVERY | `{ deliveryTaskId, lat, lng }` |
| `delivery:location_broadcast` | Server→Client | BUYER | `{ lat, lng, estimatedArrival }` |
| `delivery:status_changed` | Server→Client | BUYER | `{ status, message }` |
| `delivery:new_assignment` | Server→Client | DELIVERY | `{ taskId, pickupAddress, deliveryAddress }` |
| `order:status_changed` | Server→Client | BUYER | `{ orderId, status }` |

---

## Environment Variables Required

```bash
# Common (all services)
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# MongoDB (one per service)
MONGO_URI_USER=mongodb://localhost:27017/user_db
MONGO_URI_PRODUCT=mongodb://localhost:27017/product_db
MONGO_URI_ORDER=mongodb://localhost:27017/order_db
MONGO_URI_PAYMENT=mongodb://localhost:27017/payment_db
MONGO_URI_REVIEW=mongodb://localhost:27017/review_db
MONGO_URI_SELLER=mongodb://localhost:27017/seller_db
MONGO_URI_NOTIFICATION=mongodb://localhost:27017/notification_db
MONGO_URI_DELIVERY=mongodb://localhost:27017/delivery_db
MONGO_URI_REFERRAL=mongodb://localhost:27017/referral_db
MONGO_URI_RECOMMENDATION=mongodb://localhost:27017/recommendation_db
MONGO_URI_STOREFRONT=mongodb://localhost:27017/storefront_db
MONGO_URI_ANALYTICS=mongodb://localhost:27017/analytics_db

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=bazzar-assets
CLOUDFRONT_URL=https://cdn.bazzar.com

# Payment Gateways
KHALTI_SECRET_KEY=
KHALTI_PUBLIC_KEY=
ESEWA_MERCHANT_CODE=
ESEWA_SECRET_KEY=
FONEPAY_MERCHANT_CODE=
FONEPAY_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Notifications
SENDGRID_API_KEY=
SPARROW_SMS_TOKEN=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Service URLs (for inter-service REST calls)
USER_SERVICE_URL=http://user-service:8001
PRODUCT_SERVICE_URL=http://product-service:8002
ORDER_SERVICE_URL=http://order-service:8004
REFERRAL_SERVICE_URL=http://referral-service:8012
```
