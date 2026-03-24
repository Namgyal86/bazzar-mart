# API Specification

> Base URL: `https://api.platform.com/api/v1`
> Auth header: `Authorization: Bearer <jwt_token>`
> All responses: `{ "success": bool, "data": any, "error": string, "meta"?: { page, limit, total } }`
> JWT roles: `BUYER` | `SELLER` | `ADMIN` | `DELIVERY`

---

## Auth (User Service — :8001)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Register (role defaults to BUYER) |
| POST | `/auth/login` | None | Login → `{ accessToken, refreshToken, user }` |
| POST | `/auth/logout` | JWT | Revoke refresh token |
| POST | `/auth/token/refresh` | None | Body: `{ refreshToken }` → new access token |
| POST | `/auth/password/reset/request` | None | Send OTP to email |
| POST | `/auth/password/reset/confirm` | None | `{ email, otp, newPassword }` |
| GET | `/users/me` | JWT | Own profile |
| PATCH | `/users/me` | JWT | Update profile |
| PATCH | `/users/me/fcm-token` | JWT | Update FCM push token (Flutter apps call on login) |
| GET | `/users/me/addresses` | JWT | List addresses |
| POST | `/users/me/addresses` | JWT | Add address |
| PATCH | `/users/me/addresses/:id` | JWT | Update address |
| DELETE | `/users/me/addresses/:id` | JWT | Delete address |

---

## Products (Product Service — :8002)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | None | List (filters: `category`, `seller`, `min_price`, `max_price`, `rating`, `in_stock`, `sort`) |
| GET | `/products/:id` | None | Product detail |
| GET | `/products/:id/variants` | None | Variants list |
| GET | `/categories` | None | Category tree |
| GET | `/categories/:id/products` | None | Products by category |
| POST | `/seller/products` | SELLER | Create product |
| PUT | `/seller/products/:id` | SELLER | Full update |
| DELETE | `/seller/products/:id` | SELLER | Soft-delete (set isActive: false) |
| POST | `/seller/products/import` | SELLER | Bulk CSV import |
| PATCH | `/seller/products/:id/inventory` | SELLER | `{ stock }` — update stock |

---

## Cart (Cart Service — :8003)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/cart` | JWT | Get cart |
| POST | `/cart/items` | JWT | Add item `{ productId, variantId?, quantity }` |
| PATCH | `/cart/items/:id` | JWT | Update qty |
| DELETE | `/cart/items/:id` | JWT | Remove item |
| DELETE | `/cart` | JWT | Clear cart |
| POST | `/cart/items/:id/save-for-later` | JWT | Move to saved |
| GET | `/cart/saved` | JWT | Saved-for-later list |

---

## Orders (Order Service — :8004)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders/checkout` | BUYER | Create order from cart — body: `{ addressId, paymentMethod, couponCode?, useReferralCredits? }` |
| GET | `/orders` | JWT | Own orders |
| GET | `/orders/:id` | JWT | Order detail |
| POST | `/orders/:id/cancel` | BUYER | Cancel order |
| GET | `/seller/orders` | SELLER | Orders containing seller's products |
| PATCH | `/seller/orders/:id/status` | SELLER | Update fulfillment status |
| POST | `/seller/orders/:id/tracking` | SELLER | `{ trackingNumber, carrier }` |
| GET | `/admin/orders` | ADMIN | All orders (filter by status, date, seller) |

---

## Payments (Payment Service — :8005)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/initiate` | BUYER | `{ orderId, method }` → gateway payment intent |
| POST | `/payments/webhook` | Gateway sig | Stripe / Razorpay webhook |
| GET | `/payments/:id` | JWT | Payment status |
| POST | `/payments/:id/refund` | ADMIN | Issue refund |

---

## Reviews (Review Service — :8006)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products/:id/reviews` | None | Reviews for product |
| POST | `/products/:id/reviews` | BUYER | Post review `{ orderItemId, rating, title, body, images? }` |
| PATCH | `/reviews/:id` | BUYER | Edit own review |
| DELETE | `/reviews/:id` | BUYER | Delete own review |
| POST | `/reviews/:id/helpful` | BUYER | Increment helpful count |
| POST | `/reviews/:id/report` | BUYER | Flag review |

---

## Sellers (Seller Service — :8007)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/sellers/register` | BUYER → SELLER | Submit seller registration |
| GET | `/sellers/:slug` | None | Public seller profile |
| GET | `/seller/dashboard` | SELLER | Stats summary |
| GET | `/seller/analytics/revenue` | SELLER | Revenue by period |
| GET | `/seller/analytics/products` | SELLER | Per-product performance |
| GET | `/sellers` | ADMIN | All sellers |
| PATCH | `/sellers/:id/status` | ADMIN | Approve / suspend |

---

## Delivery (Delivery Service — :8013) ← NEW

### Delivery Agent

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/delivery/auth/register` | None | Agent registration (pending admin verify) |
| POST | `/delivery/auth/login` | None | Login → JWT with `role: DELIVERY` |
| GET | `/delivery/me` | DELIVERY | Own agent profile |
| PATCH | `/delivery/me` | DELIVERY | Update vehicle info, photo |
| PATCH | `/delivery/me/status` | DELIVERY | `{ status: 'AVAILABLE' | 'OFFLINE' }` |
| GET | `/delivery/tasks/active` | DELIVERY | Currently assigned task |
| POST | `/delivery/tasks/:id/accept` | DELIVERY | Accept task |
| POST | `/delivery/tasks/:id/reject` | DELIVERY | Reject task (auto-reassigns) |
| POST | `/delivery/tasks/:id/pickup` | DELIVERY | Mark picked up from seller |
| POST | `/delivery/tasks/:id/deliver` | DELIVERY | Mark delivered + upload proof photo |
| POST | `/delivery/tasks/:id/fail` | DELIVERY | `{ reason }` — failed delivery |
| GET | `/delivery/me/earnings` | DELIVERY | Earnings history |
| GET | `/delivery/me/history` | DELIVERY | Past delivery tasks |

### Buyer — Tracking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/delivery/track/:orderId` | BUYER | Delivery status + agent name + live ETA |
| POST | `/delivery/:taskId/rate` | BUYER | `{ rating: 1-5 }` — rate agent after delivery |

### Admin — Delivery Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/delivery/agents` | ADMIN | List agents (filter: status, city, verified) |
| GET | `/admin/delivery/agents/:id` | ADMIN | Agent detail + delivery stats |
| PATCH | `/admin/delivery/agents/:id/verify` | ADMIN | Approve / suspend agent |
| GET | `/admin/delivery/tasks` | ADMIN | All tasks (filter: status, date, agent) |
| POST | `/admin/delivery/tasks/:id/reassign` | ADMIN | Manual reassign `{ agentId }` |
| GET | `/admin/delivery/earnings` | ADMIN | Pending payouts list |
| POST | `/admin/delivery/earnings/payout` | ADMIN | Trigger batch payout `{ agentIds? }` |

---

## Search (Search Service — :8009)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/products` | None | `?q=&category=&min_price=&max_price=&rating=&sort=` |
| GET | `/search/suggestions` | None | `?q=` — autocomplete |

---

## Storefront Designer (Storefront Service — :8011)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/storefront/design` | SELLER | Get current draft |
| PUT | `/storefront/design` | SELLER | Save / autosave draft |
| POST | `/storefront/design/publish` | SELLER | Publish → S3 + CDN |
| GET | `/storefront/design/versions` | SELLER | Version history |
| POST | `/storefront/design/rollback/:version` | SELLER | Roll back |
| POST | `/storefront/assets/upload` | SELLER | Upload logo/banner |
| GET | `/storefront/templates` | SELLER | Available templates |
| GET | `/store/:slug` | PUBLIC | Serve published storefront (static CDN) |

---

## Referral System (Referral Service — :8012)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/referrals/my-code` | JWT | Own referral code + share URL |
| GET | `/referrals/dashboard` | JWT | Referral stats |
| GET | `/referrals/history` | JWT | Referral list |
| GET | `/referrals/wallet` | JWT | Credit balance + transaction history |
| POST | `/referrals/apply` | JWT | Apply credits to cart |
| GET | `/referrals/validate/:code` | None | Validate code at signup |
| GET | `/admin/referrals` | ADMIN | All referrals |
| PATCH | `/admin/referrals/:id/revoke` | ADMIN | Revoke referral |
| GET | `/admin/referral-config` | ADMIN | View config rules |
| PATCH | `/admin/referral-config/:key` | ADMIN | Update config rule |

---

## Notifications (:8008)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | JWT | User's notification list |
| PATCH | `/notifications/:id/read` | JWT | Mark read |
| POST | `/notifications/preferences` | JWT | Update push/email/SMS prefs |

---

## Admin (across services)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users` | ADMIN | All users |
| PATCH | `/admin/users/:id/status` | ADMIN | Ban / unban |
| GET | `/admin/products` | ADMIN | Moderation queue |
| PATCH | `/admin/products/:id/approve` | ADMIN | Approve listing |
| GET | `/admin/analytics` | ADMIN | Platform-wide GMV, DAU, conversion |
| POST | `/admin/coupons` | ADMIN | Create coupon |

---

## Socket.io Events

> Server URL: `wss://api.platform.com`
> Auth: Pass JWT in `auth` option: `IO.OptionBuilder().setAuth({'token': jwtToken})`

| Event | Direction | Who | Payload |
|-------|-----------|-----|---------|
| `track:join` | Client→Server | BUYER | `orderId` |
| `delivery:location_update` | Client→Server | DELIVERY | `{ deliveryTaskId, lat, lng }` |
| `delivery:location_broadcast` | Server→Client | BUYER | `{ lat, lng, estimatedArrival }` |
| `delivery:status_changed` | Server→Client | BUYER | `{ status, message, timestamp }` |
| `delivery:new_assignment` | Server→Client | DELIVERY | `{ taskId, pickupAddress, deliveryAddress }` |
| `order:status_changed` | Server→Client | BUYER | `{ orderId, status }` |
