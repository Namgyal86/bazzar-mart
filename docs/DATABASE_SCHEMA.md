# Database Schema

> **Database: MongoDB 7 (Mongoose ODM)**
> One MongoDB database per microservice. Services never share databases or join across service boundaries.

---

## Design Rules

- All `_id` fields use MongoDB `ObjectId` (Mongoose default)
- All collections include `createdAt` and `updatedAt` (via `{ timestamps: true }`)
- Soft deletes via `isActive: Boolean` — never hard delete user data
- Cross-service references stored as `String` (serialized ObjectId) — no Mongoose `populate` across services
- Add indexes for all fields used in queries — defined in schema with `index: true` or `Schema.index()`

---

## 1. user_db (User Service)

```typescript
// users collection
{
  _id: ObjectId,
  email: String,           // unique, required
  phone: String,
  passwordHash: String,    // bcrypt
  role: 'BUYER' | 'SELLER' | 'ADMIN' | 'DELIVERY',
  firstName: String,
  lastName: String,
  profilePhotoUrl: String,
  isVerified: Boolean,
  isActive: Boolean,
  referralCode: String,    // unique, e.g. "JOHN2024XK"
  referredBy: String,      // userId of referrer
  fcmToken: String,        // Firebase Cloud Messaging token for push
  createdAt: Date,
  updatedAt: Date
}
Indexes: { email: 1 }, { referralCode: 1 }

// addresses collection
{
  _id: ObjectId,
  userId: String,          // ref → users
  label: String,           // 'Home', 'Work'
  addressLine1: String,
  addressLine2: String,
  city: String,
  state: String,
  country: String,
  postalCode: String,
  coordinates: {           // GeoJSON for distance calc
    type: 'Point',
    coordinates: [Number]  // [lng, lat]
  },
  isDefault: Boolean,
  createdAt: Date
}
Indexes: { userId: 1 }

// refreshTokens collection
{
  _id: ObjectId,
  userId: String,
  tokenHash: String,
  expiresAt: Date,
  isRevoked: Boolean,
  createdAt: Date
}
TTL index: { expiresAt: 1 } (auto-delete expired tokens)
```

---

## 2. product_db (Product Service)

```typescript
// categories collection
{
  _id: ObjectId,
  name: String,
  slug: String,            // unique
  parentId: String,        // self-ref for tree
  imageUrl: String,
  sortOrder: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}

// products collection
{
  _id: ObjectId,
  sellerId: String,        // ref → seller_db
  categoryId: String,
  name: String,
  slug: String,            // unique
  description: String,
  brand: String,
  basePrice: Number,
  salePrice: Number,
  currency: String,        // default 'USD'
  stock: Number,
  lowStockThreshold: Number,
  weightKg: Number,
  isActive: Boolean,
  isFeatured: Boolean,
  metadata: Object,        // flexible extra fields
  createdAt: Date,
  updatedAt: Date
}
Indexes: { sellerId: 1 }, { categoryId: 1 }, { isActive: 1, createdAt: -1 }, { basePrice: 1 }

// productVariants collection
{
  _id: ObjectId,
  productId: String,       // ref → products
  sku: String,             // unique
  variantName: String,     // 'Red / XL'
  attributes: Object,      // { color: 'Red', size: 'XL' }
  priceModifier: Number,
  stock: Number,
  imageUrl: String,
  isActive: Boolean,
  createdAt: Date
}

// productImages collection
{
  _id: ObjectId,
  productId: String,
  url: String,
  altText: String,
  sortOrder: Number,
  isPrimary: Boolean,
  createdAt: Date
}
```

---

## 3. cart_db / Redis (Cart Service)

Cart state is stored in **Redis** (not MongoDB) for speed and auto-expiry:

```
Key:   cart:{userId}
Type:  Redis Hash
Value: JSON-serialized cart items
TTL:   7 days (refreshed on every update)

Key:   cart:saved:{userId}
Type:  Redis Hash
Value: Saved-for-later items
TTL:   30 days
```

---

## 4. order_db (Order Service)

```typescript
// orders collection
{
  _id: ObjectId,
  userId: String,
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED',
  deliveryAddress: {        // Snapshot at order time
    addressLine1: String,
    city: String,
    country: String,
    postalCode: String,
    coordinates: { type: 'Point', coordinates: [Number] }
  },
  subtotal: Number,
  discountAmount: Number,
  shippingFee: Number,
  taxAmount: Number,
  referralDeduction: Number,
  totalAmount: Number,
  couponCode: String,
  notes: String,
  statusHistory: [{
    status: String,
    note: String,
    changedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
Indexes: { userId: 1 }, { status: 1, createdAt: -1 }

// orderItems collection
{
  _id: ObjectId,
  orderId: String,
  productId: String,
  variantId: String,
  sellerId: String,
  productName: String,      // Snapshot
  quantity: Number,
  unitPrice: Number,
  totalPrice: Number,
  status: String,
  trackingNumber: String,
  createdAt: Date
}
Indexes: { orderId: 1 }, { sellerId: 1 }
```

---

## 5. payment_db (Payment Service)

```typescript
// payments collection
{
  _id: ObjectId,
  orderId: String,             // unique — one payment per order
  userId: String,
  amount: Number,              // in smallest unit (paisa for NPR, cents for USD)
  currency: 'NPR' | 'USD' | 'INR',
  method: 'KHALTI' | 'ESEWA' | 'FONEPAY' | 'CARD' | 'UPI' | 'COD',
  gateway: 'KHALTI' | 'ESEWA' | 'FONEPAY' | 'STRIPE' | 'RAZORPAY' | 'INTERNAL',
  gatewayPaymentId: String,    // e.g. Khalti pidx, eSewa transaction_uuid
  gatewayOrderId: String,
  gatewayToken: String,        // Khalti token, eSewa token
  status: 'PENDING' | 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'EXPIRED',
  verifiedAt: Date,
  gatewayResponse: Object,     // Full raw response (for audit/disputes)
  isCOD: Boolean,
  codCollectedAt: Date,
  failureReason: String,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
Indexes: { orderId: 1 (unique) }, { userId: 1 }, { status: 1 }

// refunds collection
{
  _id: ObjectId,
  paymentId: String,
  amount: Number,
  reason: String,
  gatewayRefundId: String,
  status: 'PENDING' | 'PROCESSED',
  createdAt: Date
}
```

---

## 6. seller_db (Seller Service)

```typescript
// sellers collection
{
  _id: ObjectId,
  userId: String,           // unique, ref → user_db
  businessName: String,
  slug: String,             // unique — used in /store/<slug>
  gstin: String,
  businessType: 'INDIVIDUAL' | 'COMPANY',
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED',
  bio: String,
  logoUrl: String,
  bannerUrl: String,
  rating: Number,
  totalSales: Number,
  createdAt: Date,
  updatedAt: Date
}

// sellerBankAccounts collection
{
  _id: ObjectId,
  sellerId: String,
  accountHolderName: String,
  accountNumberEncrypted: String,
  bankName: String,
  isPrimary: Boolean,
  createdAt: Date
}

// sellerPayouts collection
{
  _id: ObjectId,
  sellerId: String,
  amount: Number,
  status: 'PENDING' | 'PAID',
  periodStart: Date,
  periodEnd: Date,
  transactionRef: String,
  createdAt: Date
}
```

---

## 7. review_db (Review Service)

```typescript
// reviews collection
{
  _id: ObjectId,
  productId: String,
  userId: String,
  orderItemId: String,      // unique — one review per order item
  rating: Number,           // 1–5
  title: String,
  body: String,
  imageUrls: [String],
  isVerifiedPurchase: Boolean,
  helpfulCount: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
Indexes: { productId: 1, isActive: 1 }, { userId: 1 }
```

---

## 8. delivery_db (Delivery Service) ← NEW

> Full schema details in `DELIVERY_SERVICE.md`

```typescript
// deliveryAgents collection
{
  _id: ObjectId,
  userId: String,           // ref → user_db (role: DELIVERY)
  name: String,
  phone: String,
  vehicleType: 'BIKE' | 'SCOOTER' | 'CAR' | 'VAN',
  vehicleNumber: String,
  status: 'OFFLINE' | 'AVAILABLE' | 'ON_DELIVERY',
  currentLocation: { type: 'Point', coordinates: [Number, Number] },
  rating: Number,
  totalDeliveries: Number,
  totalEarnings: Number,
  isVerified: Boolean,
  isActive: Boolean,
  fcmToken: String,
  createdAt: Date,
  updatedAt: Date
}
Indexes: { currentLocation: '2dsphere' }, { status: 1 }

// deliveryTasks collection
{
  _id: ObjectId,
  orderId: String,
  buyerId: String,
  sellerId: String,
  agentId: String,
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELLED',
  pickupAddress: Object,
  deliveryAddress: Object,
  estimatedDistance: Number,
  estimatedDuration: Number,
  proofOfDeliveryUrl: String,
  agentEarning: Number,
  buyerRating: Number,
  createdAt: Date,
  updatedAt: Date
}

// locationHistory collection (time-series, TTL 30 days)
{
  _id: ObjectId,
  deliveryTaskId: String,
  agentId: String,
  coordinates: [Number, Number],
  timestamp: Date         // TTL index: expires after 30 days
}

// agentEarnings collection
{
  _id: ObjectId,
  agentId: String,
  deliveryTaskId: String,
  orderId: String,
  amount: Number,
  status: 'PENDING' | 'PAID',
  paidAt: Date,
  createdAt: Date
}
```

---

## 9. storefront_db (Storefront Designer Service)

```typescript
// storefrontDesigns collection
{
  _id: ObjectId,
  sellerId: String,         // unique — one design per seller
  version: Number,
  isPublished: Boolean,
  designJson: Object,       // Full StoreDesign (theme + sections[])
  publishedUrl: String,     // CDN URL
  createdAt: Date,
  updatedAt: Date
}

// storefrontVersions collection (version history)
{
  _id: ObjectId,
  designId: String,
  version: Number,
  designJson: Object,
  publishedAt: Date,
  publishedBy: String
}

// storefrontAssets collection
{
  _id: ObjectId,
  sellerId: String,
  assetType: 'logo' | 'banner' | 'photo',
  s3Key: String,
  cdnUrl: String,
  fileSizeBytes: Number,
  createdAt: Date
}
```

---

## 10. referral_db (Referral Service)

> Full schema in `REFERRAL_SYSTEM.md`

```typescript
// referralConfig — { key, value, description }
// referrals — { referrerId, refereeId, code, status, firstOrderId, ... }
// referralWallets — { userId (unique), balance, totalEarned, totalSpent }
// referralCreditTransactions — full audit trail per credit movement
// referralIdentityClaims — hashed email/phone anti-abuse tracking
```

---

## 11. notification_db (Notification Service)

```typescript
// notificationLogs collection
{
  _id: ObjectId,
  userId: String,
  channel: 'EMAIL' | 'SMS' | 'PUSH',
  eventType: String,        // 'ORDER_CONFIRMED', 'DELIVERY_ASSIGNED', etc.
  recipient: String,        // email or phone
  subject: String,
  body: String,
  status: 'PENDING' | 'SENT' | 'FAILED',
  errorMessage: String,
  sentAt: Date,
  createdAt: Date
}
Indexes: { userId: 1 }, { status: 1, createdAt: -1 }
```
