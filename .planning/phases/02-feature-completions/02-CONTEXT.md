# Phase 2: Feature Completions - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete 9 partially-built or broken features so every user-facing flow works end-to-end with correct data side effects. No new features — scope is strictly fixing what already exists: auth flows (password reset + email verification), order side effects (wallet deduction + stock restore), data corrections (coupon seeding + seller analytics real query + product Zod validation), and service correctness (delivery persistence + GPS gate + idempotent referral handler).

</domain>

<decisions>
## Implementation Decisions

### Email Infrastructure (FEAT-01, FEAT-02)
- **D-01:** Send transactional emails (password reset, email verification) directly from api-monolith using the SendGrid SDK. No Kafka round-trip — these are synchronous user-facing actions. Add `SENDGRID_API_KEY` to the monolith's env schema.
- **D-02:** Email sending is fire-and-forget from the auth controller. If SendGrid fails, log the error server-side but do not block the 200 response on token creation (tokens are saved; user can request resend).
- **D-03:** Store reset/verify tokens as fields on the existing UserSchema — add `passwordResetToken`, `passwordResetExpiry`, `emailVerificationToken`, `emailVerificationExpiry`. Hash the token (sha256 of `crypto.randomBytes(32)`) before storing; the raw token goes in the email link.
- **D-04:** Token expiry: 15 minutes for password reset, 24 hours for email verification. After use, clear both the token and expiry fields.

### Auth Flows (FEAT-01)
- **D-05:** `POST /api/v1/auth/password/forgot` accepts `{ email }`, finds user, generates signed token, hashes+stores it, sends reset email, returns `{ success: true }` regardless (no user enumeration). If no matching user, respond the same — don't reveal existence.
- **D-06:** `POST /api/v1/auth/password/reset` accepts `{ token, newPassword }`, hashes the incoming token, looks up a user where `passwordResetToken === hash && passwordResetExpiry > Date.now()`, updates password via `user.password = newPassword` (pre-save hook handles bcrypt hash), clears token fields, returns `{ success: true }`.

### Email Verification (FEAT-02)
- **D-07:** On successful registration, generate an email verification token and send a verification link to the registered email. Registration itself succeeds even if email sending fails.
- **D-08:** `GET /api/v1/auth/verify-email?token=<raw>` is the verification endpoint. Hash the incoming token, find user with matching `emailVerificationToken` and valid expiry, set `isEmailVerified = true`, clear token fields.
- **D-09:** Gate at API layer: in `createOrder`, check `req.user.isEmailVerified === false` and return 400 `{ success: false, error: 'Email verification required before checkout' }`. Same gate in the seller registration handler.

### Wallet Deduction (FEAT-03)
- **D-10:** Add `walletAmount` (optional, non-negative number) to the order creation Zod schema. If `walletAmount > 0`, validate that the user has sufficient balance before stock decrement: `Wallet.findOne({ userId })` and check `balance >= walletAmount`. If insufficient, return 400 `{ success: false, error: 'Insufficient wallet balance' }`.
- **D-11:** Deduct wallet after successful stock decrement, before `Order.create`. Use `Wallet.findOneAndUpdate({ userId, balance: { $gte: walletAmount } }, { $inc: { balance: -walletAmount } })`. If this returns null (concurrent depletion), roll back stock and return 409.
- **D-12:** If `Order.create` fails after wallet deduction, restore both stock and wallet balance (extend existing rollback pattern to include wallet).
- **D-13:** If `walletAmount` exceeds available balance, reject with 400 — no partial credit. Client has the current balance from `/referrals/apply` response.

### Stock Restore on Cancel (FEAT-04)
- **D-14:** In `cancelOrder`, after setting `order.status = 'CANCELLED'`, iterate `order.items` and call `Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } })` for each. Wrap all increments in `Promise.all`. Log any per-item failure but do not block the cancel response. Match existing rollback pattern in order creation.

### BAZZAR10 Coupon Seeding (FEAT-05)
- **D-15:** Remove the hardcoded `if (body.couponCode.toUpperCase() === 'BAZZAR10')` branch in `order.controller.ts`. All coupon validation goes through the existing database-backed path below it.
- **D-16:** Add a seed script at `services/api-monolith/scripts/seed-coupons.ts`. The script upserts a `BAZZAR10` Coupon document: type `PERCENTAGE`, value `10`, `usageLimit: 1000`, `validUntil: 1 year from run date`, `minOrder: 500` (NPR), `isActive: true`. Use `findOneAndUpdate` with `upsert: true` so it is safe to re-run.
- **D-17:** Add `"seed:coupons": "ts-node scripts/seed-coupons.ts"` to api-monolith's `package.json`.

### Seller Analytics Real Query (FEAT-06)
- **D-18:** Replace the hardcoded `prev: Math.round(totalRevenue * 0.85), change: 15` values in `getSellerAnalytics` with a real historical query. Query orders for the same sellerId over the equivalent prior period (e.g., if current = last 30 days, prior = 31–60 days ago). Use the same MongoDB query structure; aggregate revenue and order count from actual data.

### Product Zod Validation (FEAT-07)
- **D-19:** `createProductSchema` already exists in `product.controller.ts` and is applied to `req.body` before `Product.create`. Verify there is no bypass path (e.g., a separate seller-specific route that skips this schema). If validation is already in place and no bypass exists, FEAT-07 is satisfied by the existing code — confirm and close.

### Delivery Service MongoDB Persistence (FEAT-08)
- **D-20:** Create a Mongoose `Delivery` model in `services/delivery-service/src/models/delivery.model.ts` backed by the existing `delivery_db` MongoDB connection. Persist all delivery records to this collection instead of the in-memory `deliveries: any[]` array. Load existing deliveries from DB on startup.
- **D-21:** Gate the GPS simulation `setInterval` in `delivery-service/src/index.ts` (lines 170–178) behind `if (process.env.NODE_ENV !== 'production')`. Do not remove the simulation — it's useful for local dev.

### Referral Idempotency (FEAT-09)
- **D-22:** Replace the two-step `findOne` + status check with a single atomic `findOneAndUpdate({ referredId: userId, status: 'PENDING' }, { $set: { status: 'COMPLETED' } }, { new: false })`. Only credit the wallet if the update returned a document (i.e., there was actually a PENDING referral to claim). This makes the handler idempotent — a duplicate ORDER_CREATED event cannot double-credit.

### Claude's Discretion
- Exact email template HTML/text for password reset and verification links (keep it plain and functional)
- Whether to extract email-sending into a shared `sendEmail(to, subject, text)` helper in `shared/services/email.ts` — recommended for reuse across FEAT-01 and FEAT-02
- Exact `SENDGRID_FROM_EMAIL` env var name and from-address value
- Delivery model schema field names (orderId, driverId, status, location, createdAt — match existing in-memory structure)
- Whether to convert the `agentOnline` in-memory map to DB as well or leave it in-memory for this phase (in-memory is fine for online/offline status)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements (source of truth)
- `.planning/REQUIREMENTS.md` §Features — All 9 FEAT requirements with acceptance criteria
- `.planning/codebase/CONCERNS.md` — Full issue descriptions with exact file paths and line numbers for all broken features

### Files to modify — Auth flows (FEAT-01, FEAT-02)
- `services/api-monolith/src/modules/users/auth.controller.ts` — Register/login handlers; add forgot/reset/verify endpoints here
- `services/api-monolith/src/modules/users/user.routes.ts` — Add new auth routes
- `services/api-monolith/src/modules/users/models/user.model.ts` — Add token fields to UserSchema
- `services/api-monolith/src/config/env.ts` — Add SENDGRID_API_KEY to env schema

### Files to modify — Order side effects (FEAT-03, FEAT-04)
- `services/api-monolith/src/modules/orders/order.controller.ts` — `createOrder` (wallet deduction, email gate), `cancelOrder` (stock restore)
- `services/api-monolith/src/modules/referrals/referral.controller.ts` lines 95–111 — wallet apply endpoint and ORDER_CREATED handler (FEAT-09)

### Files to modify — Data corrections (FEAT-05, FEAT-06, FEAT-07)
- `services/api-monolith/src/modules/orders/order.controller.ts` lines 177–191 — remove BAZZAR10 hardcoded branch
- `services/api-monolith/src/modules/sellers/seller.controller.ts` lines 238–285 — `getSellerAnalytics`, replace hardcoded prev values
- `services/api-monolith/src/modules/products/product.controller.ts` lines 12–27 — existing `createProductSchema` (verify/confirm FEAT-07)

### Files to modify — Delivery service (FEAT-08)
- `services/delivery-service/src/index.ts` lines 54–58 (in-memory array), lines 170–178 (GPS simulation)

### Wallet model location
- `services/api-monolith/src/modules/referrals/` — Wallet model lives here (alongside referral controller per CONCERNS.md)

### Success criteria (from ROADMAP.md Phase 2)
1. Password reset email received → link submits → can log in with new password
2. New user receives verification email → checkout blocked before verifying
3. Wallet credit applied at checkout → exact amount deducted from balance after order
4. Cancelled order → stock quantities restored
5. BAZZAR10 exists as seeded Coupon document with limits/expiry
6. Seller analytics percentage changes reflect real historical data
7. Product with invalid/missing required field → validation error
8. Delivery state survives service restart
9. Referral bonus never credited twice for same event

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `services/api-monolith/src/shared/middleware/error.ts` — `handleError(err, res)` created in Phase 1; use for all catch blocks in new endpoints
- `services/api-monolith/src/shared/middleware/auth.ts` — `authenticate()` and `requireRole()` middleware; apply to new auth routes
- `services/api-monolith/src/modules/users/models/user.model.ts` — `comparePassword()` and bcrypt pre-save hook already handle password hashing; set `user.password = newPlaintext` and `save()` for reset
- `services/api-monolith/src/modules/orders/order.controller.ts` lines 155–161 — existing stock rollback pattern (`Promise.all` + `.catch` log); extend for wallet rollback
- Coupon model already supports `usageLimit`, `validUntil`, `minOrder` fields — seed script just needs to insert using the existing model

### Established Patterns
- All controllers: `try { ... } catch (err) { handleError(err, res); }` — use this for new endpoints
- Token pattern: `crypto.randomBytes(32).toString('hex')` as raw token; `crypto.createHash('sha256').update(rawToken).digest('hex')` for storage — standard Node.js approach, no extra deps
- Env schema: `services/api-monolith/src/config/env.ts` uses Zod; add `SENDGRID_API_KEY: z.string()` and `SENDGRID_FROM_EMAIL: z.string().email()`
- Kafka events: fire-and-forget with `.catch(() => {})` — acceptable for email event; but for auth flows, call SendGrid directly (no Kafka for transactional email per D-01)

### Integration Points
- `createOrder` in `order.controller.ts`: wallet deduction slots in at the existing coupon validation block (lines 176–200); `walletAmount` becomes another deduction applied to `subtotal`
- `cancelOrder` (line 291+): stock restore slots in after `order.status = 'CANCELLED'` before `order.save()`
- Delivery service: existing `delivery_db` Mongoose connection at line 15 is already initialized — the Delivery model just needs to be created and used

</code_context>

<specifics>
## Specific Ideas

- Email token generation should use Node.js built-in `crypto` module — no external deps needed
- User enumeration protection on forgot-password: always return `{ success: true }` even for unknown email
- The wallet deduction check should be an atomic `findOneAndUpdate` with a `$gte` balance filter (not a separate find-then-update) to prevent TOCTOU race conditions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-feature-completions*
*Context gathered: 2026-04-15*
