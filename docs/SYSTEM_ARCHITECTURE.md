# System Architecture

> Stack: **MERN** (MongoDB · Express.js · React/Next.js · Node.js)
> Mobile: **Flutter** — 4 apps (Buyer, Seller, Admin, Delivery)
> Architecture: **Microservices + Event-Driven**

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
                └──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬─────┘
          Clients  │  │  │  │  │  │  │  │  │  │  │  │
   ┌──────────────┐│  │  │  │  │  │  │  │  │  │  │  │
   │ Buyer App    ││  │  │  │  │  │  │  │  │  │  │  │
   │ (Flutter)    ││  │  │  │  │  │  │  │  │  │  │  │
   ├──────────────┤│  │  │  │  │  │  │  │  │  │  │  │
   │ Seller App   ││  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼
   │ (Flutter)    ││ User Prod Cart Ord Pay Rev Sell Srch Notif Store Ref Delivery
   ├──────────────┤│ :8001:8002:8003:8004:8005:8006:8007:8009:8008:8011:8012 :8013
   │ Admin App    ││  │    │    │    │    │    │    │    │    │    │    │      │
   │ (Flutter)    ││  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴──────┘
   ├──────────────┤│                          │
   │ Delivery App ││              ┌───────────▼───────────┐
   │ (Flutter)    ││              │    Apache Kafka        │
   ├──────────────┤│              └───────────┬───────────┘
   │ Web (Next.js)││                          │
   └──────────────┘│         ┌────────────────┼──────────────────┐
                             ▼                ▼                   ▼
                    Notification Svc    Analytics         Recommendation
                    (Email/SMS/FCM)                         Engine
```

---

## 2. Service Inventory

> Full specs: see individual `*_SERVICE.md` files for Payment, Notification, Search, Delivery, Analytics

| Service | Port | Database | Stack | Events Published |
|---------|------|----------|-------|-----------------|
| User Service | 8001 | MongoDB: user_db | Node/Express/TS | USER_REGISTERED |
| Product Service | 8002 | MongoDB: product_db | Node/Express/TS | PRODUCT_CREATED, INVENTORY_UPDATED |
| Cart Service | 8003 | Redis | Node/Express/TS | CART_UPDATED |
| Order Service | 8004 | MongoDB: order_db | Node/Express/TS | ORDER_CREATED, ORDER_STATUS_CHANGED |
| Payment Service | 8005 | MongoDB: payment_db | Node/Express/TS | PAYMENT_SUCCESS, PAYMENT_FAILED |
| Review Service | 8006 | MongoDB: review_db | Node/Express/TS | REVIEW_POSTED |
| Seller Service | 8007 | MongoDB: seller_db | Node/Express/TS | SELLER_APPROVED, PAYOUT_PROCESSED |
| Notification Service | 8008 | MongoDB: notification_db | Node/Express/TS | — |
| Search Service | 8009 | Elasticsearch | Node/Express/TS | — |
| Recommendation Service | 8010 | MongoDB | Node/Express/TS | — |
| Storefront Designer | 8011 | MongoDB: storefront_db | Node/Express/TS | STOREFRONT_PUBLISHED |
| Referral Service | 8012 | MongoDB: referral_db | Node/Express/TS | REFERRAL_REWARD_ISSUED |
| **Delivery Service** | **8013** | **MongoDB: delivery_db** | **Node/Express/TS + Socket.io** | **DELIVERY_ASSIGNED, DELIVERY_COMPLETED** |
| **Analytics Service** | **8014** | **MongoDB: analytics_db** | **Node/Express/TS** | **— (consumer only)** |

---

## 3. Four Actors & Their Access Paths

```
BUYER
  └─ Flutter buyer_app ──► API Gateway ──► User, Product, Cart, Order,
                                           Payment, Review, Referral,
                                           Delivery (tracking only)
  └─ Web browser (Next.js buyer pages)

SELLER
  └─ Flutter seller_app ──► API Gateway ──► Seller, Product, Order,
                                            Storefront Designer, Notification
  └─ Web browser (Next.js seller dashboard)

ADMIN
  └─ Flutter admin_app ──► API Gateway ──► All services (admin endpoints)
  └─ Web browser (Next.js admin dashboard)

DELIVERY GUY
  └─ Flutter delivery_app ──► API Gateway ──► Delivery Service
                           ──► Socket.io ──► Real-time GPS streaming
                                             Assignment notifications
```

---

## 4. Kafka Topics

| Topic | Producer | Consumers |
|-------|----------|-----------|
| `user.registered` | User Svc | Notification Svc |
| `order.created` | Order Svc | Payment Svc, Notification Svc, Analytics |
| `order.confirmed` | Order Svc | **Delivery Svc** (creates DeliveryTask), Notification Svc |
| `order.status_changed` | Order Svc | Notification Svc, Analytics |
| `order.cancelled` | Order Svc | **Delivery Svc** (cancel task), Notification Svc |
| `payment.success` | Payment Svc | Order Svc, Notification Svc, Seller Svc |
| `payment.failed` | Payment Svc | Order Svc, Notification Svc |
| `product.created` | Product Svc | Search Svc, Recommendation Svc |
| `inventory.updated` | Product Svc | Notification Svc (back-in-stock) |
| `review.posted` | Review Svc | Recommendation Svc |
| `delivery.assigned` | **Delivery Svc** | Notification Svc (SMS/push to buyer) |
| `delivery.picked_up` | **Delivery Svc** | Notification Svc |
| `delivery.completed` | **Delivery Svc** | Order Svc (mark DELIVERED), Notification Svc, Analytics |
| `delivery.failed` | **Delivery Svc** | Order Svc, Notification Svc |
| `referral.reward_issued` | Referral Svc | Notification Svc |
| `storefront.published` | Storefront Svc | CDN invalidation |

---

## 5. Authentication & JWT

```
1. Client sends credentials → User Service (or Delivery Service for agents)
2. Service validates → issues JWT:
   { sub: userId, role: 'BUYER'|'SELLER'|'ADMIN'|'DELIVERY',
     sellerId?: string, deliveryAgentId?: string, exp: ... }
3. Client attaches: Authorization: Bearer <token>
4. API Gateway validates JWT signature (shared public key)
5. Gateway injects X-User-Id, X-User-Role headers into downstream requests
6. Services trust injected headers (no re-validation needed)
```

---

## 6. Real-time Architecture (Socket.io)

Socket.io runs **inside the Delivery Service** on port 8013 (same port, upgraded HTTP connection).

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
| Product detail | 2 min |
| Product listing page | 5 min |
| Cart (Redis primary store) | 7 days |
| Search results | 1 min |
| Seller analytics | 10 min |
| Referral config rules | 5 min |
| User session / rate limit counters | 15 min |

---

## 8. Infrastructure

| Component | Technology |
|-----------|-----------|
| Primary Databases | MongoDB Atlas (one cluster per service) |
| Cache + Job Queue | Redis 7 (ElastiCache) |
| Message Bus | Apache Kafka (Amazon MSK) |
| Search | Elasticsearch 8 (Amazon OpenSearch) |
| Object Storage | AWS S3 |
| CDN | AWS CloudFront |
| API Gateway | Kong |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Containers | Docker |
| Orchestration | Kubernetes (AWS EKS) |
| IaC | Terraform |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Logging | Winston → CloudWatch |
