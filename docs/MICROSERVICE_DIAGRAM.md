# Microservice Architecture Diagram

---

## Full System Diagram

```
                          ┌──────────────────────────────┐
                          │        AWS CloudFront CDN     │
                          │   (images, static, storefronts)│
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │      AWS ALB Load Balancer    │
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │     Kong API Gateway          │
                          │  Auth · Rate Limit · Routing  │
                          └──┬──┬──┬──┬──┬──┬──┬──┬──┬──┘
                             │  │  │  │  │  │  │  │  │  │
              ┌──────────────┘  │  │  │  │  │  │  │  │  └─────────────────────┐
              │      ┌──────────┘  │  │  │  │  │  │  └───────────────────┐    │
              │      │     ┌───────┘  │  │  │  │  └─────────────────┐    │    │
              │      │     │    ┌─────┘  │  │  └──────────────┐     │    │    │
              │      │     │    │    ┌───┘  └──────────┐       │     │    │    │
              ▼      ▼     ▼    ▼    ▼          ▼       ▼       ▼     ▼    ▼    ▼
           ┌────┐ ┌─────┐ ┌────┐ ┌─────┐ ┌────────┐ ┌──────┐ ┌──────┐ ┌─────┐ ┌──────┐ ┌──────────┐
           │User│ │Prod │ │Cart│ │Order│ │Payment │ │Review│ │Seller│ │Notif│ │Search│ │Storefront│
           │Svc │ │ Svc │ │Svc │ │ Svc │ │  Svc   │ │ Svc  │ │ Svc  │ │ Svc │ │ Svc  │ │Designer  │
           │8001│ │8002 │ │8003│ │8004 │ │  8005  │ │ 8006 │ │ 8007 │ │8008 │ │ 8009 │ │   8011   │
           └─┬──┘ └──┬──┘ └─┬──┘ └──┬──┘ └───┬────┘ └──┬───┘ └──┬───┘ └──┬──┘ └──┬───┘ └────┬─────┘
             │        │      │       │         │          │        │        │        │           │
             └────────┴──────┴───────┴─────────┴──────────┴────────┴────────┴────────┴───────────┘
                                                     │
                                    ┌────────────────▼──────────────────┐
                                    │           Apache Kafka             │
                                    │  (Event Bus — 9 topics)            │
                                    └────────────────┬──────────────────┘
                                                     │
                     ┌───────────────────────────────┼────────────────────────────┐
                     ▼                               ▼                            ▼
             ┌───────────────┐             ┌─────────────────┐         ┌──────────────────┐
             │  Notification  │             │   Rec Engine    │         │  Analytics Svc   │
             │   Service      │             │    (8010)       │         │  (internal)      │
             │  Email/SMS/Push│             │  ML-based recs  │         │                  │
             └───────────────┘             └─────────────────┘         └──────────────────┘
```

---

## Kafka Event Flow

```
USER_REGISTERED (user.registered)
    User Svc ──────────────────────────────► Notification Svc (welcome email)

ORDER_CREATED (order.created)
    Order Svc ─────┬───────────────────────► Payment Svc (process payment)
                   ├───────────────────────► Notification Svc (order confirmation)
                   └───────────────────────► Analytics Svc (GMV tracking)

PAYMENT_SUCCESS (payment.success)
    Payment Svc ───┬───────────────────────► Order Svc (confirm order)
                   ├───────────────────────► Notification Svc (payment receipt)
                   └───────────────────────► Seller Svc (queue payout)

PAYMENT_FAILED (payment.failed)
    Payment Svc ───┬───────────────────────► Order Svc (cancel order)
                   └───────────────────────► Notification Svc (payment failed alert)

ORDER_STATUS_CHANGED (order.status_changed)
    Order Svc ─────┬───────────────────────► Notification Svc (status email/push)
                   └───────────────────────► Analytics Svc

PRODUCT_CREATED (product.created)
    Product Svc ───┬───────────────────────► Search Svc (index in Elasticsearch)
                   └───────────────────────► Rec Engine (update model)

INVENTORY_UPDATED (inventory.updated)
    Product Svc ───┬───────────────────────► Cart Svc (invalidate cache)
                   └───────────────────────► Notification Svc (back-in-stock alerts)

REVIEW_POSTED (review.posted)
    Review Svc ────┬───────────────────────► Rec Engine (update ratings model)
                   └───────────────────────► Analytics Svc

STOREFRONT_PUBLISHED (storefront.published) ← NEW
    Storefront Svc ─────────────────────────► CDN Invalidation (clear CloudFront cache)

REFERRAL_REWARD_ISSUED (referral.reward_issued) ← NEW
    Referral Svc ──────────────────────────► Notification Svc (alert referrer + referee)

REFERRAL_REWARD_REVOKED (referral.reward_revoked) ← NEW
    Referral Svc ──────────────────────────► Notification Svc (alert both users)

REFERRAL_CREDIT_EXPIRED (referral.credit_expired) ← NEW
    Referral Svc ──────────────────────────► Notification Svc (expiry warning emails)
```

---

## Synchronous REST Call Map

```
Cart Svc ──────── GET /products/{id}/ ──────────► Product Svc  (validate item before adding)
Order Svc ──────── GET /payments/{id}/ ──────────► Payment Svc (confirm payment on checkout)
Order Svc ──────── PATCH /inventory/ ────────────► Product Svc (reserve stock on order)
Storefront Svc ─── GET /seller/products/ ────────► Product Svc (load seller's products for designer)
Notification Svc ── GET /users/{id}/ ────────────► User Svc    (get email/phone for notification)
```

---

## Data Store Map

```
User Svc            ──► MongoDB: user_db
Product Svc         ──► MongoDB: product_db
                    ──► Elasticsearch (search/suggestions index)
Cart Svc            ──► Redis (ephemeral cart state — no MongoDB)
Order Svc           ──► MongoDB: order_db
Payment Svc         ──► MongoDB: payment_db
Review Svc          ──► MongoDB: review_db
Seller Svc          ──► MongoDB: seller_db
Notification Svc    ──► MongoDB: notification_db
Search Svc          ──► Elasticsearch (no MongoDB)
Recommendation Svc  ──► MongoDB: recommendation_db
Storefront Svc      ──► MongoDB: storefront_db
                    ──► S3: platform-storefronts bucket
                    ──► CloudFront (CDN distribution)
Referral Svc        ──► MongoDB: referral_db
Delivery Svc        ──► MongoDB: delivery_db
Analytics Svc       ──► MongoDB: analytics_db

All services        ──► Redis (caching, BullMQ queues, rate limits, sessions)
```
