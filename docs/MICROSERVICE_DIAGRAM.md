# Architecture Diagram — Modular Monolith

> **Architecture changed** (2026-04-05): 11 original microservices consolidated into a single
> **`api-monolith`** (port 8100). Only `delivery-service` and `notification-service` remain
> independent. All inter-module communication uses the typed **InternalBus (EventEmitter)** instead
> of HTTP or Kafka.

---

## Full System Diagram

```
                         ┌──────────────────────────────┐
                         │       AWS CloudFront CDN      │
                         │  (images, static, storefronts)│
                         └──────────────┬───────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │      AWS ALB Load Balancer    │
                         └──────────────┬───────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │     Kong API Gateway          │
                         │  Auth · Rate Limit · Routing  │
                         └──────┬────────────┬──────────┘
                                │            │
               ┌────────────────▼──┐    ┌────▼──────────────────┐
               │   API Monolith    │    │  Delivery Service      │
               │   port 8100       │    │  port 8013             │
               │                   │    │  Socket.io (real-time) │
               │  ┌─────────────┐  │    └────────────────────────┘
               │  │  users      │  │
               │  │  products   │  │    ┌────────────────────────┐
               │  │  orders     │  │    │  Notification Service  │
               │  │  cart       │  │    │  port 8008             │
               │  │  payments   │  │    │  Email/SMS/FCM          │
               │  │  sellers    │  │    └────────────────────────┘
               │  │  reviews    │  │
               │  │  referrals  │  │
               │  │  support    │  │
               │  │  storefront │  │
               │  │  search     │  │
               │  │  recommend. │  │
               │  │  analytics  │  │
               │  └─────────────┘  │
               └────────┬──────────┘
                        │
           ┌────────────▼──────────────┐
           │       Apache Kafka         │
           │  (External event bus)      │
           │  Topics published by       │
           │  monolith → kept services  │
           └────────────┬──────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   delivery-service  notification  (future external)
   (consumes:        (consumes:
   order.confirmed)   user.registered,
                      order.*, payment.*,
                      delivery.*, seller.approved)
```

---

## Internal Event Bus (InternalBus) — in-process only

Replaces all inter-module Kafka consumers and HTTP calls between merged modules.

```
PAYMENT_SUCCESS (payment:success)
    payments ──┬──────────────────► orders  (mark PAID, update status)
               ├──────────────────► sellers (credit seller balance)
               └──────────────────► analytics (increment daily metrics)
               ╌╌ Kafka: payment.success ──► notification-service

PAYMENT_FAILED (payment:failed)
    payments ──────────────────────► orders  (mark FAILED)
               ╌╌ Kafka: payment.failed ──► notification-service

ORDER_CREATED (order:created)
    orders ─────┬─────────────────► referrals (wallet credit on first order)
                ├─────────────────► recommendations (record PURCHASE interaction)
                └─────────────────► analytics (increment daily metrics)
                ╌╌ Kafka: order.created ──► notification-service, delivery-service

REVIEW_POSTED (review:posted)
    reviews ────┬─────────────────► reviews (recalculate product rating)
                └─────────────────► recommendations (record REVIEW interaction)
                ╌╌ Kafka: review.posted (future analytics extension)

USER_REGISTERED (user:registered)
    auth.controller ──────────────► analytics (new user daily metrics)
                ╌╌ Kafka: user.registered ──► notification-service

PRODUCT_CREATED (product:created)
    products ──────────────────────► recommendations (seed trendingproducts)

DELIVERY_COMPLETED (delivery:completed)
    Kafka consumer ─┬─────────────► orders (mark DELIVERED)
    (from delivery  └─────────────► analytics (deliveriesCompleted++)
     service)
```

---

## Kafka Topics — External Only

Only events crossing process boundaries go through Kafka.

| Topic | Producer | Consumers |
|-------|----------|-----------|
| `order.created` | api-monolith | notification-service, delivery-service |
| `order.status_updated` | api-monolith | notification-service |
| `payment.success` | api-monolith | notification-service |
| `payment.failed` | api-monolith | notification-service |
| `user.registered` | api-monolith | notification-service |
| `review.posted` | api-monolith | (notification-service, future) |
| `seller.approved` | api-monolith | notification-service |
| `delivery.assigned` | delivery-service | notification-service |
| `delivery.picked_up` | delivery-service | notification-service |
| `delivery.completed` | delivery-service | api-monolith (order + analytics) |
| `delivery.failed` | delivery-service | api-monolith, notification-service |

---

## Data Store Map

```
api-monolith       ──► MongoDB: bazzar_monolith   (single DB, all collections)
                       Collections: users, addresses, products, categories, banners,
                                    orders, coupons, payments, sellers, reviews,
                                    referrals, wallets, messages, storefronts,
                                    views, analyticsevents, platformsettings,
                                    platformmetrics, sellermetrics,
                                    userproductinteractions, trendingproducts
                   ──► Redis: cart store (TTL 7 days), rate limit counters

delivery-service   ──► MongoDB: delivery_db
notification-service ──► (stateless — delivers emails/SMS/push via external providers)
```

---

## Eliminated Synchronous HTTP Calls

The following cross-service HTTP calls existed in the original microservice architecture
and have been removed. All are now direct Mongoose queries or internalBus events.

| Was | Now |
|-----|-----|
| `seller-service → GET /products?sellerId=` | `Product.find({ sellerId })` |
| `seller-service → GET /orders?sellerId=` | `Order.find({ 'items.sellerId' })` |
| `auth → POST /referrals/apply` | `handleUserRegistered()` direct call |
| `analytics → GET /orders/admin/stats` | `Order.aggregate(...)` |
| `analytics → GET /users/admin/stats` | `db.collection('users').countDocuments()` |
| `search → GET /products?search=` | `Product.find({ $or: [{ name: re }] })` |
| `recommendations → GET /products?category=` | `Product.find({ category })` |
```
