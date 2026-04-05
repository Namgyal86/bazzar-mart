# Analytics & Recommendation — Module Specification

> **Merged into monolith** (2026-04-05): Both services are now modules inside
> `services/api-monolith/src/modules/analytics/` and `src/modules/recommendations/`.
> All Kafka consumers replaced with **internalBus** event handlers.
> Single shared MongoDB database: `bazzar_monolith`.

---

# Analytics Module

> Module: `analytics` | Location: `src/modules/analytics/`
> Was: `analytics-service` | Port: **8014** | Database: `analytics_db`

---

## 1. Overview

Aggregates platform-wide events into metrics for the Admin dashboard, Seller analytics, and internal reporting. Listens to Kafka, writes aggregated stats to MongoDB, and exposes read-only REST endpoints to the Admin and Seller services.

---

## 2. MongoDB Schema (analytics_db)

```typescript
// platformMetrics — daily snapshots
{
  _id: ObjectId,
  date: Date,                    // day bucket (midnight UTC)
  gmv: Number,                   // gross merchandise value
  totalOrders: Number,
  completedOrders: Number,
  cancelledOrders: Number,
  newUsers: Number,
  activeUsers: Number,
  newSellers: Number,
  deliveriesCompleted: Number,
  avgOrderValue: Number,
  topCategories: [{ categoryId, name, revenue }],
  paymentMethodBreakdown: {
    KHALTI: Number, ESEWA: Number, FONEPAY: Number, CARD: Number, COD: Number
  },
  createdAt: Date
}
Indexes: { date: -1 } (unique per day)

// sellerMetrics — per seller per day
{
  _id: ObjectId,
  sellerId: String,
  date: Date,
  revenue: Number,
  orders: Number,
  unitsSold: Number,
  avgOrderValue: Number,
  topProducts: [{ productId, name, units, revenue }],
  createdAt: Date
}
Indexes: { sellerId: 1, date: -1 }

// productMetrics — per product per day
{
  _id: ObjectId,
  productId: String,
  date: Date,
  views: Number,
  cartAdds: Number,
  purchases: Number,
  revenue: Number,
  conversionRate: Number,   // purchases / views
  createdAt: Date
}

// userEvents — raw event stream (TTL 90 days)
{
  _id: ObjectId,
  userId: String,
  event: String,   // 'product_view' | 'cart_add' | 'order_placed' | etc.
  metadata: Object,
  timestamp: Date
}
TTL index: { timestamp: 1 } expireAfterSeconds: 7776000
```

---

## 3. InternalBus Handlers → Metrics Written (replaces Kafka consumers)

| Topic | Metric Updated |
|-------|---------------|
| `user.registered` | platformMetrics.newUsers++ |
| `order.created` | platformMetrics.totalOrders++, GMV += amount |
| `order.status_changed` (DELIVERED) | platformMetrics.completedOrders++ |
| `order.status_changed` (CANCELLED) | platformMetrics.cancelledOrders++ |
| `payment.success` | platformMetrics.paymentMethodBreakdown[gateway]++, sellerMetrics.revenue += sellerAmount |
| `product.created` | productMetrics init |
| `delivery.completed` | platformMetrics.deliveriesCompleted++ |
| `review.posted` | productMetrics.reviews++ |

---

## 4. API Endpoints (Admin + Seller only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/analytics/overview` | ADMIN | Platform KPIs (GMV, orders, users, DAU) |
| GET | `/admin/analytics/revenue` | ADMIN | `?period=daily|weekly|monthly&from=&to=` |
| GET | `/admin/analytics/payments` | ADMIN | Breakdown by gateway (Khalti, eSewa, etc.) |
| GET | `/admin/analytics/top-products` | ADMIN | Top products by revenue |
| GET | `/admin/analytics/top-sellers` | ADMIN | Top sellers by GMV |
| GET | `/seller/analytics/overview` | SELLER | Own dashboard KPIs |
| GET | `/seller/analytics/revenue` | SELLER | Own revenue by period |
| GET | `/seller/analytics/products` | SELLER | Own product performance |

---

## 5. Agent Build Checklist

- [ ] `analytics-service` Node.js project
- [ ] MongoDB models per schema above
- [ ] Kafka consumers for all listed events
- [ ] Upsert logic for daily metric buckets (use `findOneAndUpdate` with `upsert: true`)
- [ ] All REST endpoints with date-range filtering
- [ ] Admin: payment gateway breakdown chart data
- [ ] BullMQ daily aggregation job (midnight cron)

---

---

# Recommendation Module

> Module: `recommendations` | Location: `src/modules/recommendations/`
> Was: `recommendation-service` | Port: **8010** | Database: `recommendation_db`

---

## 1. Overview

Suggests relevant products to buyers using three strategies:
1. **Collaborative filtering** — "Users who bought X also bought Y"
2. **Content-based** — Similar products by category, brand, attributes
3. **Trending** — Products with high views/purchases in last 7 days

---

## 2. MongoDB Schema (recommendation_db)

```typescript
// userProductInteractions — sparse matrix for collaborative filtering
{
  _id: ObjectId,
  userId: String,
  productId: String,
  interactionType: 'view' | 'cart_add' | 'purchase' | 'review',
  weight: Number,         // view=1, cart_add=3, purchase=5, review=4
  createdAt: Date
}
Indexes: { userId: 1, productId: 1 } (unique compound)
TTL: 180 days

// productSimilarity — precomputed pairs
{
  _id: ObjectId,
  productId: String,
  similarProducts: [{ productId, score }],  // Top 10 similar
  strategy: 'collaborative' | 'content',
  updatedAt: Date
}
Indexes: { productId: 1 (unique) }

// trendingProducts — updated hourly
{
  _id: ObjectId,
  period: 'hourly' | 'daily' | 'weekly',
  products: [{ productId, score, views, purchases }],
  computedAt: Date
}
```

---

## 3. API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/recommendations/homepage` | JWT (opt) | Personalised homepage feed |
| GET | `/recommendations/similar/:productId` | None | Similar products (content-based) |
| GET | `/recommendations/also-bought/:productId` | None | Collaborative — also bought |
| GET | `/recommendations/trending` | None | Trending products |
| GET | `/recommendations/for-you` | JWT | Personalised for logged-in buyer |

---

## 4. InternalBus Event Handlers (replaces Kafka consumers)

| Event | Action |
|-------|--------|
| `order:created` | Record PURCHASE interaction for each order item |
| `review:posted` | Record REVIEW interaction (weight=4) |
| `product:created` | Seed `trendingproducts` collection entry |

---

## 5. Agent Build Checklist

- [ ] MongoDB models per schema above
- [ ] Kafka consumers: order.confirmed, review.posted, product.created
- [ ] Collaborative filtering: item-item similarity using cosine similarity on interaction matrix
- [ ] Content-based: similarity by categoryId + brand + price range
- [ ] Trending: BullMQ cron job every hour — aggregate views/purchases from analytics events
- [ ] All REST endpoints
- [ ] Redis cache for recommendation results (TTL: 10 min per user)
- [ ] Cold-start fallback: show trending products for new/guest users
