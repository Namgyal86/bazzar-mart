# System Architecture

> Stack: **MERN** (MongoDB · Express.js · React/Next.js · Node.js)
> Mobile: **Flutter** — 4 apps (Buyer, Seller, Admin, Delivery)
> Architecture: **Modular Monolith + Event-Driven** (migrated from microservices 2026-04-05)

---

## 1. High-Level Diagram

```
                ┌──────────────────────────────────────────┐
                │         AWS CloudFront CDN                │
                │   (images, static assets, storefronts)    │
                └─────────────────┬────────────────────────┘
                                  │
                ┌─────────────────▼────────────────────────┐
                │           AWS ALB Load Balancer           │
                └─────────────────┬────────────────────────┘
                                  │
                ┌─────────────────▼────────────────────────┐
                │         Kong API Gateway                  │
                │   JWT Validation · Rate Limiting          │
                │   Routing · SSL Termination               │
                └──┬────────────────────────────┬──────────┘
                   │                            │
   ┌───────────────▼────────────────┐    ┌──────▼──────────────────┐
   │        API Monolith            │    │   Delivery Service       │
   │        port 8100               │    │   port 8013              │
   │  13 modules, single process    │    │   Socket.io real-time    │
   └────────────────────────────────┘    └─────────────────────────┘
             │                                       │
   ┌─────────▼─────────────────────────────────────▼──────────┐
   │                    Apache Kafka                            │
   │  External event bus — only crosses process boundaries     │
   └─────────────────────────────────────┬────────────────────┘
                                         │
                         ┌───────────────▼──────────────┐
                         │      Notification Service     │
                         │   Email (SendGrid)            │
                         │   SMS (Sparrow SMS)           │
                         │   Push (Firebase FCM)         │
                         └──────────────────────────────┘

Clients:
  Buyer App (Flutter) ──┐
  Seller App (Flutter) ─┤
  Admin App (Flutter)  ─┼──► Kong API Gateway ──► API Monolith
  Delivery App (Flutter)┤                    └──► Delivery Service
  Web (Next.js) ────────┘
```

---

## 2. Service Inventory

| Service | Port | Database | Status | Notes |
|---------|------|----------|--------|-------|
| **api-monolith** | **8100** | **MongoDB: bazzar_monolith** | ✅ Active | 13 modules — see module list below |
| delivery-service | 8013 | MongoDB: delivery_db | ✅ Active | Socket.io real-time GPS |
| notification-service | 8008 | — (stateless) | ✅ Active | SendGrid, Sparrow SMS, FCM |

### api-monolith Modules

| Module | Original Port | Route Prefix | Description |
|--------|--------------|-------------|-------------|
| users | 8001 | `/api/v1/auth`, `/api/v1/users` | Auth, JWT, profile, addresses, wishlist |
| products | 8002 | `/api/v1/products`, `/api/v1/categories`, `/api/v1/banners` | CRUD, categories, banners |
| cart | 8003 | `/api/v1/cart` | Redis-backed cart (TTL 7 days) |
| orders | 8004 | `/api/v1/orders`, `/api/v1/coupons` | Order lifecycle, coupon management |
| payments | 8005 | `/api/v1/payments` | eSewa + Khalti gateway integration |
| reviews | 8006 | `/api/v1/reviews` | Product reviews, auto-rating update |
| sellers | 8007 | `/api/v1/seller` | Seller dashboard, payout management |
| referrals | 8012 | `/api/v1/referrals` | Referral codes, wallet credit |
| support | 8015 | `/api/v1/support` | Buyer-seller messaging |
| storefront | 8011 | `/api/v1/storefront` | BYOS drag-and-drop seller storefronts |
| search | 8009 | `/api/v1/search` | Full-text product search (MongoDB) |
| recommendations | 8010 | `/api/v1/recommendations` | View tracking, personalised product recs |
| analytics | 8014 | `/api/v1/analytics` | Event tracking, admin KPI dashboard |

---

## 3. Four Actors & Their Access Paths

```
BUYER
  └─ Flutter buyer_app ──► API Gateway ──► api-monolith (users, products, cart,
                                           orders, payments, reviews, referrals,
                                           search, recommendations)
                        ──► Delivery Service (tracking via Socket.io)
  └─ Web browser (Next.js buyer pages)

SELLER
  └─ Flutter seller_app ──► API Gateway ──► api-monolith (sellers, products,
                                            orders, storefront, support)
  └─ Web browser (Next.js seller dashboard)

ADMIN
  └─ Flutter admin_app ──► API Gateway ──► api-monolith (all admin endpoints)
  └─ Web browser (Next.js admin dashboard with analytics overview)

DELIVERY GUY
  └─ Flutter delivery_app ──► API Gateway ──► Delivery Service
                           ──► Socket.io ──► Real-time GPS streaming
```

---

## 4. Event Communication

### Internal (InternalBus — in-process, zero latency)

| Event | Producer Module | Consumer Modules |
|-------|----------------|-----------------|
| `payment:success` | payments | orders, sellers, analytics |
| `payment:failed` | payments | orders |
| `order:created` | orders | referrals, recommendations, analytics |
| `review:posted` | reviews | reviews (rating update), recommendations |
| `delivery:completed` | Kafka consumer | orders, analytics |
| `user:registered` | users/auth | analytics |
| `product:created` | products | recommendations |

### External Kafka (crosses process boundaries)

| Topic | Producer | Consumers |
|-------|----------|-----------|
| `order.created` | api-monolith | notification-service, delivery-service |
| `order.status_updated` | api-monolith | notification-service |
| `payment.success` | api-monolith | notification-service |
| `payment.failed` | api-monolith | notification-service |
| `user.registered` | api-monolith | notification-service |
| `seller.approved` | api-monolith | notification-service |
| `delivery.completed` | delivery-service | api-monolith |
| `delivery.assigned` | delivery-service | notification-service |
| `delivery.failed` | delivery-service | notification-service |

---

## 5. Authentication & JWT

```
1. Client sends credentials → api-monolith /api/v1/auth/login
2. Monolith validates → issues JWT:
   { sub: userId, role: 'BUYER'|'SELLER'|'ADMIN'|'DELIVERY',
     sellerId?: string, exp: ... }
3. Client attaches: Authorization: Bearer <token>
4. API Gateway validates JWT signature (shared public key)
5. Gateway injects X-User-Id, X-User-Role headers
6. Monolith auth middleware reads headers (no re-validation needed)
```

---

## 6. Real-time Architecture (Socket.io)

Socket.io runs inside the **Delivery Service** on port 8013.

```
delivery_app (Flutter)
  ├─ HTTP:  POST /delivery/tasks/:id/deliver    → Express route
  └─ WS:    emit('delivery:location_update')    → Socket.io handler

buyer_app (Flutter)
  ├─ HTTP:  GET /delivery/track/:orderId        → Express route
  └─ WS:    on('delivery:location_broadcast')   ← Socket.io event

Rooms:
  agent:{agentId}    ← Delivery agent socket
  order:{orderId}    ← Buyer tracking this order
  admin:dashboard    ← Admin live dashboard
```

---

## 7. Caching Strategy (Redis)

| Data | TTL |
|------|-----|
| Cart (Redis primary store) | 7 days |
| Auth rate limit counters | 15 min |

> Note: Product listing/detail cache was per-service in the old architecture.
> The monolith uses direct MongoDB queries with indexed fields instead.

---

## 8. Infrastructure

| Component | Technology |
|-----------|-----------|
| Primary Database | MongoDB Atlas (single `bazzar_monolith` cluster) |
| Delivery DB | MongoDB Atlas (separate `delivery_db` cluster) |
| Cache | Redis 7 (ElastiCache) — cart + rate limits |
| Message Bus | Apache Kafka (Amazon MSK) — external events only |
| Object Storage | AWS S3 |
| CDN | AWS CloudFront |
| API Gateway | Kong |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| SMS | Sparrow SMS (Nepal) |
| Email | SendGrid |
| Containers | Docker |
| Orchestration | Kubernetes (AWS EKS) |
| IaC | Terraform |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Logging | Winston → CloudWatch |
