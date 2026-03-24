# 🤖 AI Coding Agent — Master Instructions

> **Read this file first. Then read every file in `/docs` in the order listed below before writing a single line of code.**

---

## Tech Stack at a Glance

| Layer | Technology |
|-------|-----------|
| Backend | **Node.js 20 LTS + Express.js + TypeScript** |
| Database | **MongoDB 7 (Mongoose ODM)** — one DB per service |
| Cache / Queues | **Redis 7** — BullMQ jobs, sessions, rate limiting |
| Search | **Elasticsearch 8** |
| Events | **Apache Kafka** |
| Web Frontend | **Next.js 14 + React + TypeScript** |
| Mobile | **Flutter** — 4 separate apps |
| Real-time | **Socket.io** |

---

## Four Actors — Four Flutter Apps

| Actor | Flutter App | Access Level |
|-------|------------|-------------|
| **Buyer** | `buyer_app` | Browse, cart, checkout, track delivery |
| **Seller** | `seller_app` | List products, manage orders, view analytics |
| **Admin** | `admin_app` | Platform management, moderation, payouts |
| **Delivery Guy** | `delivery_app` | Accept deliveries, GPS tracking, mark delivered |

All four apps hit the **same backend APIs** via the API Gateway. Role is encoded in the JWT.

---

## Mandatory Reading Order

1. `MASTER_PROMPT.md` <- you are here
2. `PRODUCT_REQUIREMENTS.md`
3. `SYSTEM_ARCHITECTURE.md`
4. `DATABASE_SCHEMA.md`
5. `API_SPECIFICATION.md`
6. `FLUTTER_API_GUIDE.md`     <- How Flutter apps consume the APIs
7. `NODE_ARCHITECTURE.md`     <- Node.js service structure & patterns
8. `PAYMENT_SERVICE.md`       <- Khalti, eSewa, Fonepay, Stripe
9. `DELIVERY_SERVICE.md`      <- Delivery Guy actor full spec
10. `NOTIFICATION_SERVICE.md` <- Email/SMS/FCM
11. `SEARCH_SERVICE.md`       <- Elasticsearch
12. `ANALYTICS_AND_RECOMMENDATION.md`
13. `BYOS_STOREFRONT_DESIGNER.md`
14. `REFERRAL_SYSTEM.md`
15. `MICROSERVICE_DIAGRAM.md`
16. `DEPLOYMENT_ARCHITECTURE.md`
17. `TECH_STACK.md`
18. `CODING_STANDARDS.md`

---

## Microservices (14 total)

| # | Service | Port | Spec File |
|---|---------|------|-----------|
| 1 | User Service | 8001 | NODE_ARCHITECTURE.md (reference impl) |
| 2 | Product Service | 8002 | API_SPECIFICATION.md |
| 3 | Cart Service | 8003 | API_SPECIFICATION.md |
| 4 | Order Service | 8004 | API_SPECIFICATION.md |
| 5 | **Payment Service** | **8005** | **PAYMENT_SERVICE.md** <- Khalti, eSewa, Fonepay, Stripe |
| 6 | Review Service | 8006 | API_SPECIFICATION.md |
| 7 | Seller Service | 8007 | API_SPECIFICATION.md |
| 8 | **Notification Service** | **8008** | **NOTIFICATION_SERVICE.md** <- Email/SMS/FCM |
| 9 | **Search Service** | **8009** | **SEARCH_SERVICE.md** <- Elasticsearch |
| 10 | **Recommendation Service** | **8010** | **ANALYTICS_AND_RECOMMENDATION.md** |
| 11 | Storefront Designer Service | 8011 | BYOS_STOREFRONT_DESIGNER.md |
| 12 | Referral Service | 8012 | REFERRAL_SYSTEM.md |
| 13 | **Delivery Service** | **8013** | **DELIVERY_SERVICE.md** <- 4th actor |
| 14 | **Analytics Service** | **8014** | **ANALYTICS_AND_RECOMMENDATION.md** |

---

## Non-Negotiable Architecture Rules

- Every service has its **own isolated MongoDB database** — zero cross-DB joins
- Inter-service: **REST for synchronous queries**, **Kafka for async state changes**
- Every service exposes `GET /health` and `GET /metrics`
- All secrets loaded from environment variables (never hardcoded)
- JWT roles: `BUYER` | `SELLER` | `ADMIN` | `DELIVERY` — enforced via middleware
- All API responses use the standard envelope: `{ success, data, error, meta? }`

---

## Payment Gateways (Nepal-focused)

| Gateway | File | Use |
|---------|------|-----|
| **Khalti** | PAYMENT_SERVICE.md §5.1 | Nepal digital wallet |
| **eSewa** | PAYMENT_SERVICE.md §5.2 | Nepal digital wallet |
| **Fonepay** | PAYMENT_SERVICE.md §5.3 | Nepal bank network QR |
| **Stripe** | PAYMENT_SERVICE.md §5.4 | International cards |
| **Razorpay** | PAYMENT_SERVICE.md | India UPI |
| **COD** | PAYMENT_SERVICE.md | Cash on delivery |

---

## Expected Deliverables

1. Full monorepo folder structure
2. All 14 Node.js/Express microservices (TypeScript, clean architecture)
3. REST API endpoints per `API_SPECIFICATION.md`
4. Nepal payment gateways per `PAYMENT_SERVICE.md`
5. Socket.io real-time per `DELIVERY_SERVICE.md`
6. Next.js web frontend
7. Four Flutter apps per `FLUTTER_API_GUIDE.md`
8. Kafka producers/consumers per service
9. BullMQ job workers per service
10. Docker Compose for local development
11. Kubernetes manifests for production
12. GitHub Actions CI/CD pipeline
13. Terraform AWS infrastructure

---

## Starting Point

Generate in this order:
1. Monorepo folder structure
2. `docker-compose.yml`
3. `user-service` as the reference implementation
4. `payment-service` (Khalti + eSewa + Fonepay integration)
5. `delivery-service` (Socket.io + GPS)
6. Remaining services in order
