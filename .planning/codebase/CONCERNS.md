# Codebase Concerns

**Analysis Date:** 2026-04-14

---

## Security Considerations

### Header-Based Auth Bypass (Critical)

- Risk: The `authenticate` middleware blindly trusts `x-user-id` and `x-user-role` headers. Any request that reaches the monolith with these headers set — even one that bypasses Kong — is granted full identity without JWT verification. A client with direct network access to the API (e.g., internal cluster traffic, misconfigured ingress) can impersonate any user or role, including ADMIN.
- Files: `services/api-monolith/src/shared/middleware/auth.ts` lines 17-24
- Current mitigation: Kong is intended to be the only entry point; the ingress config does not expose internal ports directly.
- Recommendations: Strip `x-user-id` / `x-user-role` headers at the Kong plugin level before they reach the upstream. Validate that Kong actually injects these only after JWT verification; confirm via the Kong config that no route bypasses the JWT plugin. Add a network policy in k8s to block direct external access to the monolith port (8100).

### ADMIN Role Settable at Registration

- Risk: The register endpoint accepts an optional `role` field via the request body. The Zod schema allows `BUYER | SELLER | ADMIN | DELIVERY`. A caller can register directly as ADMIN.
- Files: `services/api-monolith/src/modules/users/auth.controller.ts` line 30, `services/api-monolith/src/modules/users/auth.controller.ts` line 69
- Current mitigation: None — the role is spread directly into `User.create`.
- Recommendations: Remove `role` from the public registration schema entirely. Admins should be promoted via a protected admin endpoint or a database seed script. At minimum, filter out `ADMIN` from the allowed values in the public schema.

### Wildcard CORS on Internal Services

- Risk: Both `delivery-service` and `notification-service` use `cors({ origin: '*', credentials: true })`. This allows cross-origin requests with credentials from any domain, making those services vulnerable to CSRF if they ever serve a browser-facing endpoint.
- Files: `services/delivery-service/src/index.ts` line 19, `services/notification-service/src/index.ts` line 15
- Current mitigation: These services are intended to be internal only.
- Recommendations: Restrict CORS origin to the known frontend domain. Mirror the restrictive CORS config used in `services/api-monolith/src/app.ts`.

### Error Messages Leak Internal Detail

- Risk: The global error handler returns `err.message` verbatim in the response body. Internal database errors, constraint violations, or stack traces can reveal schema details or file paths to callers.
- Files: `services/api-monolith/src/shared/middleware/error.ts` line 9
- Current mitigation: None — production and development use the same handler.
- Recommendations: In production (`NODE_ENV === 'production'`), return a generic "Internal server error" string. Log the full error server-side. Consider distinguishing between operational errors (user-facing) and programmer errors (always hidden).

### Delivery Service Has No Authentication

- Risk: All delivery service endpoints (driver assignment, delivery completion, admin stats) accept `x-user-id` from the request header without JWT verification. Any client can impersonate a driver or trigger order-delivered Kafka events by calling the service directly.
- Files: `services/delivery-service/src/index.ts` lines 93-148
- Current mitigation: Service is intended to sit behind Kong.
- Recommendations: Add JWT verification middleware to protected delivery routes. At minimum, verify the token on the `complete` endpoint that fires the `delivery.completed` Kafka event, since that event updates order status to DELIVERED and credits seller earnings.

### Morgan Logger Always Uses `dev` Mode

- Risk: Morgan `'dev'` format logs all request paths, query strings, and status codes to stdout in production. This can expose PII (user IDs in query params, search queries) in log aggregators.
- Files: `services/api-monolith/src/app.ts` line 93
- Current mitigation: None.
- Recommendations: Switch to `morgan('combined')` or a structured JSON logger in production and conditionally use `'dev'` only when `NODE_ENV === 'development'`.

---

## Tech Debt

### Wallet Credit Reservation Is Not Implemented

- Issue: `POST /referrals/apply` validates wallet balance and returns `appliedAmount` but does not deduct or reserve the amount. The comment in the code explicitly acknowledges: "A full implementation would store a reservation token." There is no deduction call in `createOrder` either — so users can apply wallet credits at checkout but the credits are never actually subtracted from their balance.
- Files: `services/api-monolith/src/modules/referrals/referral.controller.ts` lines 95-111, `services/api-monolith/src/modules/orders/order.controller.ts` (no wallet deduction)
- Impact: Wallet credit is shown to users but never consumed. Users can apply credits on every order without balance ever decreasing.
- Fix approach: Add a `walletAmount` field to the order creation schema. In `createOrder`, after validating the coupon, call `Wallet.findOneAndUpdate` to decrement the balance. Use a Mongoose session/transaction for atomicity with the stock decrement.

### Stock Not Restored on Order Cancellation

- Issue: `cancelOrder` marks the order as CANCELLED but does not restore the decremented stock quantities back to the products. Stock is only decremented atomically on order creation; there is no matching increment on cancel.
- Files: `services/api-monolith/src/modules/orders/order.controller.ts` lines 291-305
- Impact: Cancelled orders permanently reduce available inventory. Sellers see understated stock counts, and products can incorrectly show as out-of-stock.
- Fix approach: After setting `order.status = 'CANCELLED'`, iterate `order.items` and call `Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } })` for each. Wrap in a `Promise.all`. Log any failure but do not block the cancel response.

### Hardcoded `BAZZAR10` Coupon Code

- Issue: A 10% discount coupon `BAZZAR10` is hardcoded directly in the order controller business logic in two places and is applied unconditionally — it bypasses `usageLimit`, `validUntil`, and `minOrder` checks that apply to all database-stored coupons.
- Files: `services/api-monolith/src/modules/orders/order.controller.ts` lines 176-177 and 399
- Impact: This coupon can never be disabled, has no usage cap, and ignores minimum order amounts — a permanent unlimited 10% discount for anyone who knows the code.
- Fix approach: Remove the hardcoded branch. Insert `BAZZAR10` as a seeded `Coupon` document with proper limits and expiry.

### Fake/Hardcoded Analytics Comparison Data

- Issue: The seller analytics endpoint returns fabricated `prev` period values calculated as `current * 0.85` (revenue), `current * 0.9` (orders), and `current * 0.7` (customers), with hardcoded percentage change values of `15`, `10`, `8`, and `5`. This is not real historical data.
- Files: `services/api-monolith/src/modules/sellers/seller.controller.ts` lines 278-281
- Impact: Seller dashboards display misleading analytics. Business decisions made on this data are based on fabricated numbers.
- Fix approach: Run a second aggregation query for the previous period (same date range, shifted back by the interval) and compute actual percentage change. This requires no schema changes — just a second `Order.aggregate` call.

### Seller Product Creation Has No Input Validation

- Issue: `createSellerProduct` spreads the entire raw `req.body` into `Product.create` without Zod schema validation. Any field a seller sends — including `isActive`, `isFeatured`, `sellerId` override, or `soldCount` — is written directly to the database.
- Files: `services/api-monolith/src/modules/sellers/seller.controller.ts` lines 169-175
- Impact: Sellers can set `isFeatured: true` on their own products, override `sellerId` to claim another seller's products, or set arbitrary numeric fields. Contrast with `createAdminProduct` in `services/api-monolith/src/modules/products/product.controller.ts` which uses proper validation.
- Fix approach: Add a Zod schema for the allowed seller product fields (name, description, price, images, category, stock, etc.) and validate `req.body` before calling `Product.create`.

### Delivery Service Uses In-Memory Store

- Issue: The delivery service stores all delivery records in a `const deliveries: any[]` array in memory. Data is lost on every service restart. The driver list is also hardcoded (4 static drivers).
- Files: `services/delivery-service/src/index.ts` lines 24-31
- Impact: Delivery state does not survive restarts. Kubernetes pod restarts (OOM kill, rolling deploy) silently wipe all in-flight delivery data. GPS simulation runs even in production via a `setInterval`.
- Fix approach: Persist deliveries to the existing `delivery_db` MongoDB connection (a Mongoose Delivery model). Load on startup rather than re-seeding from orders. Remove or gate the GPS simulation `setInterval` behind a `NODE_ENV !== 'production'` check.

### Password Reset Flow Is a UI-Only Stub

- Issue: The forgot-password page (`web/src/app/auth/forgot-password/page.tsx`) calls `POST /api/v1/auth/password/forgot`. No such route exists in the API — neither in `user.routes.ts` nor in any other route file. The form always shows a success message because errors are intentionally swallowed, hiding the fact that nothing actually happens.
- Files: `web/src/app/auth/forgot-password/page.tsx` lines 27-35, `services/api-monolith/src/modules/users/user.routes.ts` (missing route)
- Impact: Users who forget their password have no recovery path. The UI gives false confidence.
- Fix approach: Implement the forgot/reset flow: generate a time-limited signed token, store a hash in the user document, send a reset email (or SMS for Nepal market), and expose `POST /auth/password/forgot` + `POST /auth/password/reset` endpoints.

### Email Verification Not Enforced

- Issue: `isEmailVerified` exists on the User model and defaults to `false`, but no endpoint sets it to `true` and nothing in the auth flow gates login or actions on email verification status. The field is effectively unused.
- Files: `services/api-monolith/src/modules/users/models/user.model.ts` line 31
- Impact: Accounts can be created with fake email addresses. Email-based communications (order notifications, password reset) may bounce without detection.
- Fix approach: Add a verification token flow (similar to forgot-password above) — send a verification link on registration and gate sensitive actions (checkout, seller registration) behind `isEmailVerified === true`.

### No MongoDB Transactions for Order Creation

- Issue: The order creation flow performs multiple write operations: stock decrement (one `findOneAndUpdate` per item), order creation, wallet validation, coupon increment — all as separate, non-atomic operations. If the server crashes between the stock decrement and `Order.create`, stock is permanently lost with no order record.
- Files: `services/api-monolith/src/modules/orders/order.controller.ts` lines 139-208
- Impact: Partial failures leave the database in an inconsistent state (stock decremented, no order). The existing rollback is a best-effort `Promise.all` with a `.catch` log — it is not guaranteed to execute.
- Fix approach: Wrap the stock decrements and `Order.create` in a Mongoose session (`startSession()` + `withTransaction()`). This requires MongoDB to run in a replica set (which it should in production) and a minimal app.ts change to pass the session.

---

## Performance Bottlenecks

### Seller Analytics Loads All Orders Into Memory

- Issue: `getSellerAnalytics` fetches all orders for a seller over 6 months with `Order.find(...)` and then does JavaScript-level grouping and filtering in application memory. For active sellers with hundreds of orders, this is an unbounded in-memory operation.
- Files: `services/api-monolith/src/modules/sellers/seller.controller.ts` lines 244-271
- Impact: Slow responses and high memory usage for sellers with large order volumes. Blocks the Node.js event loop during the JavaScript aggregation phase.
- Fix approach: Replace with a MongoDB `$aggregate` pipeline that groups by month and computes revenue server-side, similar to what `getRevenueByDay` already does in `services/api-monolith/src/modules/orders/order.controller.ts`.

### Hardcoded Fetch Limits (200) Without Pagination

- Issue: Several endpoints fetch up to 200 records in a single query with no cursor-based pagination: `Review.find().limit(200)` for admin reviews, `Review.find(...).limit(200)` for seller reviews, and `Message.find(...).limit(200)` for support messages.
- Files:
  - `services/api-monolith/src/modules/reviews/review.controller.ts` line 114
  - `services/api-monolith/src/modules/sellers/seller.controller.ts` line 296
  - `services/api-monolith/src/modules/support/support.controller.ts` lines 37, 44
- Impact: As data grows, these endpoints will return large payloads and cause slow responses. No upper-bound enforcement on `limit` query param means callers can also request unbounded data on paginated endpoints.
- Fix approach: Add proper page/limit pagination with a maximum cap (e.g., `Math.min(Number(limit), 50)`). Add a `skip` + `limit` pattern consistent with other endpoints. Add a `totalCount` field for frontend pagination controls.

### Dashboard Revenue Chart Queries Are Inefficient

- Issue: `getDashboard` for sellers fetches only the last 5 recent orders but then filters them client-side to build a 7-day revenue chart. Only 5 orders are fetched, so the chart will only show revenue for days containing those 5 most-recent orders and will show 0 for all other days, regardless of actual order volume.
- Files: `services/api-monolith/src/modules/sellers/seller.controller.ts` lines 106-124
- Impact: Revenue chart data is incorrect for sellers with more than 5 orders. The chart silently displays wrong values.
- Fix approach: Either fetch all orders in the last 7 days for the seller (with `createdAt: { $gte: sevenDaysAgo }`) or use a targeted `$aggregate` pipeline.

### Missing Index on Orders for Seller Queries

- Issue: `Order.find({ 'items.sellerId': sellerId })` is a common query pattern used in seller orders, dashboard, and analytics. The `OrderSchema` only defines a compound index on `{ userId: 1, createdAt: -1 }`. There is no index on `items.sellerId`, so these queries perform full collection scans.
- Files:
  - `services/api-monolith/src/modules/orders/models/order.model.ts` (index definition)
  - `services/api-monolith/src/modules/sellers/seller.controller.ts` lines 107, 201, 244
- Impact: As order volume grows, seller dashboard and analytics queries will become progressively slower. A full collection scan on a large orders collection is a significant production bottleneck.
- Fix approach: Add `OrderSchema.index({ 'items.sellerId': 1, createdAt: -1 })` to the order model.

---

## Fragile Areas

### Internal Event Bus Has No Dead-Letter Handling

- Issue: The in-process `EventEmitter` (`internalBus`) is used for cross-module communication (payment events to orders/sellers/referrals, order events to recommendations). If a handler throws, the error is caught and logged, but the event is silently dropped. There is no retry, no dead-letter queue, and no alerting.
- Files: `services/api-monolith/src/shared/events/emitter.ts`, handlers in `services/api-monolith/src/modules/orders/order.controller.ts`, `services/api-monolith/src/modules/sellers/seller.controller.ts`, `services/api-monolith/src/modules/referrals/referral.controller.ts`
- Why fragile: A transient MongoDB timeout during `PAYMENT_SUCCESS` processing means the order status is never updated to CONFIRMED, the seller balance is never credited, and the buyer never gets notified — all silently.
- Safe modification: Add structured error logging with the full event payload. Consider persisting failed events to a `failedevents` collection for manual replay. For critical paths (payment → order status), implement a retry with exponential backoff.

### Kafka Publish Failures Are Silently Swallowed

- Issue: Nearly every `publishEvent(...)` call ends with `.catch(() => {})` — an empty catch that discards all Kafka publish failures. If Kafka is unavailable, analytics, notifications, and delivery triggers all fail silently.
- Files: Throughout `services/api-monolith/src/modules/` — visible in `orders/order.controller.ts` lines 222, 228, `sellers/seller.controller.ts` line 401, `reviews/review.controller.ts` line 91, and others.
- Why fragile: Events like `order.created` driving the notification service will be silently dropped when Kafka is down, leaving buyers without order confirmation emails/SMS.
- Safe modification: At minimum, log the dropped event topic and payload at WARN level. Consider implementing an outbox pattern: write the event to a MongoDB `outbox` collection within the same transaction as the business operation, and have a background worker publish it to Kafka.

### Referral Bonus Is Not Idempotent on Repeated ORDER_CREATED Events

- Issue: The ORDER_CREATED handler in referrals checks for `status: 'PENDING'` and then sets it to `'COMPLETED'` before crediting wallets, then sets it to `'PAID'`. If the event fires twice (e.g., EventEmitter listener registered twice, or a bug causes re-emission), the wallet balance is credited twice.
- Files: `services/api-monolith/src/modules/referrals/referral.controller.ts` lines 20-58
- Why fragile: The `$inc: { balance: REFERRAL_BONUS }` is not guarded by idempotency — only the referral status check provides protection, and it's not atomic with the wallet update.
- Safe modification: Update the referral status to `'COMPLETED'` using `findOneAndUpdate` with a `{ status: 'PENDING' }` filter and check the result before crediting wallets. This makes the handler idempotent.

### GPS Simulation Runs in Production

- Issue: A `setInterval(() => { ... }, 5000)` runs unconditionally in the delivery service, broadcasting fake GPS coordinate changes for all active order locations every 5 seconds via Socket.io. This runs in all environments including production.
- Files: `services/delivery-service/src/index.ts` lines 170-178
- Why fragile: In production, fake location updates are emitted to real buyers tracking real orders. It also creates unnecessary Socket.io broadcast traffic proportional to the number of active deliveries.
- Safe modification: Gate the interval behind `if (process.env.NODE_ENV !== 'production')` or remove it entirely once real GPS tracking is implemented.

---

## Test Coverage Gaps

### No Test Files Exist

- What's not tested: The entire codebase — all service controllers, middleware, models, payment integrations, event handlers, and web components — has zero automated test coverage. No `.test.ts`, `.spec.ts`, or `.test.tsx` files were found anywhere in the project.
- Files: All of `services/api-monolith/src/`, `services/delivery-service/src/`, `services/notification-service/src/`, `web/src/`
- Risk: Every code change is unverified. Critical business logic paths (stock decrement, payment verification, coupon validation, referral crediting) have no regression protection.
- Priority: High

### Critical Untested Paths

The following are the highest-risk flows with zero test coverage:

1. **Stock decrement race condition** — `createOrder` uses `findOneAndUpdate` with a `$gte` guard, but the multi-item rollback path is entirely untested.
   - Files: `services/api-monolith/src/modules/orders/order.controller.ts` lines 140-162

2. **Payment callback verification** — eSewa signature verification and Khalti lookup are called from browser redirect callbacks. Incorrect signature handling could allow forged payment confirmations.
   - Files: `services/api-monolith/src/modules/payments/payment.controller.ts` lines 148-171, `services/api-monolith/src/modules/payments/services/esewa.service.ts`

3. **Referral bonus double-crediting** — The idempotency gap described in Fragile Areas above is a correctness bug that only tests would catch.
   - Files: `services/api-monolith/src/modules/referrals/referral.controller.ts` lines 20-58

4. **ADMIN role escalation via registration** — The security issue of passing `role: 'ADMIN'` in the register body is not caught by any test.
   - Files: `services/api-monolith/src/modules/users/auth.controller.ts` line 69

---

## Missing Critical Features

### No Password Reset Mechanism

- Problem: Users who forget their password have no recovery path. The forgot-password UI page calls a non-existent API endpoint and silently fails.
- Blocks: User self-service account recovery. Any production deployment where real users need long-term account access.

### No Email Verification

- Problem: The `isEmailVerified` flag exists but is never set to `true`. No verification email is sent on registration.
- Blocks: Trust in user-provided email addresses. Email-based notification delivery confirmation. Compliance with basic account security expectations.

### Seller Product Validation Missing

- Problem: Sellers can inject any field into product documents on creation (see Tech Debt section above).
- Blocks: Data integrity for the product catalog. Prevents sellers from gaming featured status or manipulating sold counts.

---

## Dependencies at Risk

### `any` Type Overuse in Delivery Service

- Risk: The delivery service uses `deliveries: any[]` for its entire data store and `as any` in several places including Socket.io JWT decode. TypeScript type safety is effectively disabled for the delivery service's core data model.
- Files: `services/delivery-service/src/index.ts` lines 25, 155, 205, 223
- Impact: Runtime errors in the delivery service will not be caught by the TypeScript compiler. Refactoring is high-risk without types.
- Migration plan: Define a `Delivery` interface, replace `any[]` with `Delivery[]`, and add proper typing to the JWT decode result.

---

*Concerns audit: 2026-04-14*
