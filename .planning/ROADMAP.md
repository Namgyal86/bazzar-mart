# Roadmap: Bazzar Mart — Quality & Reliability Milestone

## Overview

Six phases harden the existing Bazzar Mart platform from the inside out. Phase 1 closes security vulnerabilities before anything else ships. Phase 2 completes broken and half-implemented features. Phase 3 adds data-integrity guarantees (transactions, event reliability, indexes). Phase 4 fixes performance problems in analytics and pagination. Phases 5 and 6 establish full test coverage — backend first so tests run against correct behavior, then web and E2E.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security Hardening** - Close all identified authentication, authorization, and CORS vulnerabilities
- [ ] **Phase 2: Feature Completions** - Finish every broken or incomplete feature flow
- [ ] **Phase 3: Data Integrity & Reliability** - Add transactions, structured event logging, and critical DB indexes
- [ ] **Phase 4: Performance Fixes** - Replace in-memory aggregations with DB pipelines; add pagination
- [ ] **Phase 5: Backend Test Suite** - Establish Jest/Supertest infrastructure and write all backend tests
- [ ] **Phase 6: Frontend & E2E Tests** - Add Vitest component tests and Playwright E2E journeys

## Phase Details

### Phase 1: Security Hardening
**Goal**: Every request is authenticated and authorized through verified tokens, with no information leaking to clients in production.
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06
**Success Criteria** (what must be TRUE):
  1. A registration request that includes `"role": "ADMIN"` in the body is rejected with a 400 error
  2. A request to a protected route carrying only x-user-id/x-user-role headers (no JWT) is rejected with 401
  3. A cross-origin request from an unknown origin to delivery-service or notification-service receives no CORS headers
  4. A 500 error in production returns a generic message with no stack trace, file path, or DB error detail
  5. A request to a protected delivery-service route (complete, driver-assign) without a valid JWT is rejected with 401
**Plans**: 3 plans

Plans:
- [x] 01-01: Auth middleware — ADMIN role block + JWT-required guard (SEC-01, SEC-02)
- [x] 01-02: Service hardening — CORS restriction on delivery/notification + JWT guard on delivery routes (SEC-03, SEC-05)
- [x] 01-03: Production hygiene — error response sanitization + Morgan environment config (SEC-04, SEC-06)

### Phase 2: Feature Completions
**Goal**: Every user-facing flow that was partially built works end-to-end with correct data side effects.
**Depends on**: Phase 1
**Requirements**: FEAT-01, FEAT-02, FEAT-03, FEAT-04, FEAT-05, FEAT-06, FEAT-07, FEAT-08, FEAT-09
**Success Criteria** (what must be TRUE):
  1. A user who requests a password reset receives an email with a link; submitting the link with a new password lets them log in with that password
  2. A newly registered user receives a verification email; attempting checkout before verifying is blocked with a clear error
  3. A buyer who applies wallet credit at checkout has that exact amount deducted from their wallet balance after the order is placed
  4. Cancelling an order that decremented stock causes the stock quantities for those items to be restored
  5. The coupon BAZZAR10 exists as a seeded Coupon document with a defined limit and expiry date; seller analytics percentage changes reflect real historical data
  6. Creating a product with an invalid or missing required field returns a validation error; delivery state survives a service restart; a referral bonus is never credited twice for the same referral event
**Plans**: 4 plans

Plans:
- [ ] 02-01: Auth flows — password reset + email verification endpoints and email delivery (FEAT-01, FEAT-02)
- [ ] 02-02: Order side effects — wallet deduction on create + stock restore on cancel (FEAT-03, FEAT-04)
- [ ] 02-03: Data corrections — coupon seeding, seller analytics real query, product Zod validation (FEAT-05, FEAT-06, FEAT-07)
- [ ] 02-04: Service correctness — delivery MongoDB persistence + GPS gate + idempotent referral handler (FEAT-08, FEAT-09)

### Phase 3: Data Integrity & Reliability
**Goal**: Order creation is atomic, event failures are visible and recoverable, and seller queries use an index.
**Depends on**: Phase 2
**Requirements**: REL-01, REL-02, REL-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. If order creation fails after stock is decremented, the stock decrement is rolled back automatically (transaction)
  2. An internalBus handler error produces a structured log entry with event name, payload excerpt, and error message; the failed event is written to a persistent store for replay
  3. A Kafka publish failure produces a WARN-level log entry containing the topic name and payload; it does not swallow the error silently
  4. The orders collection has an index on items.sellerId visible via `db.orders.getIndexes()`
**Plans**: 3 plans

Plans:
- [ ] 03-01: Order transaction — wrap stock decrement + Order.create in MongoDB session (REL-03)
- [ ] 03-02: Event reliability — structured logging + failed-event persistence for internalBus; WARN logging for Kafka catch blocks (REL-01, REL-02)
- [ ] 03-03: DB index — add compound/single index on orders.items.sellerId (PERF-04)

### Phase 4: Performance Fixes
**Goal**: Seller analytics run as DB aggregations, all list endpoints return paginated responses, and the 7-day chart queries the correct date window.
**Depends on**: Phase 3
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. The seller analytics endpoint executes a single MongoDB $aggregate pipeline; no in-memory revenue summation occurs in application code
  2. The review, support message, and seller-review endpoints accept `page` and `limit` query parameters and enforce a maximum page size; they never return unbounded result sets
  3. The seller 7-day revenue chart data corresponds to the 7 calendar days ending today, not the timestamps of the last 5 orders
**Plans**: 3 plans

Plans:
- [ ] 04-01: Analytics pipeline — rewrite seller analytics with $aggregate; fix 7-day chart date range query (PERF-01, PERF-03)
- [ ] 04-02: Pagination — add page/limit with max-cap to review and support-message endpoints (PERF-02)
- [ ] 04-03: Pagination — add page/limit with max-cap to seller-review endpoint (PERF-02)

### Phase 5: Backend Test Suite
**Goal**: The api-monolith has a working Jest/Supertest harness and tests that lock in correct behavior for auth, orders, payments, referrals, and security controls.
**Depends on**: Phase 4
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06
**Success Criteria** (what must be TRUE):
  1. Running `npm test` in api-monolith completes without configuration errors and produces a pass/fail report
  2. Tests confirm that ADMIN role self-assignment is blocked and that JWT-less requests to protected routes return 401
  3. Tests confirm that cancelling an order restores stock and that applying a coupon deducts the correct discount
  4. Tests confirm that Khalti and eSewa callback signatures are verified before an order is marked paid
  5. Tests confirm that a referral bonus is not credited twice when the handler is called twice with the same event
**Plans**: 3 plans

Plans:
- [ ] 05-01: Test infrastructure — Jest + Supertest config, test DB setup/teardown, CI script (TEST-01)
- [ ] 05-02: Core flow tests — auth flows, security controls, order flows, coupon validation (TEST-02, TEST-03, TEST-06)
- [ ] 05-03: Payment and referral tests — Khalti/eSewa callback verification, idempotent referral bonus, wallet deduction (TEST-04, TEST-05)

### Phase 6: Frontend & E2E Tests
**Goal**: The Next.js web app has component-level tests for critical forms and Playwright E2E tests that walk the full buyer and seller journeys against a running stack.
**Depends on**: Phase 5
**Requirements**: TEST-07, TEST-08, TEST-09, TEST-10, TEST-11, TEST-12, TEST-13
**Success Criteria** (what must be TRUE):
  1. Running `npm test` in the web project executes Vitest and produces a pass/fail report
  2. Component tests confirm that the login, register, and forgot-password forms render correctly and show validation errors on bad input
  3. Component tests confirm that the checkout flow renders cart items and redirects to the payment provider
  4. Playwright E2E test completes the buyer journey (register → login → add to cart → checkout) against the running dev stack without manual steps
  5. Playwright E2E test completes the seller journey (login → create product → view orders) against the running dev stack without manual steps
**Plans**: 3 plans

Plans:
- [ ] 06-01: Web test infrastructure + auth component tests — Vitest setup, login/register/forgot-password form tests (TEST-07, TEST-08)
- [ ] 06-02: Web flow component tests — buyer cart/checkout flow, seller dashboard product form and analytics (TEST-09, TEST-10)
- [ ] 06-03: E2E — Playwright setup, buyer journey, seller journey (TEST-11, TEST-12, TEST-13)
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in strict numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Hardening | 0/3 | Not started | - |
| 2. Feature Completions | 0/4 | Not started | - |
| 3. Data Integrity & Reliability | 0/3 | Not started | - |
| 4. Performance Fixes | 0/3 | Not started | - |
| 5. Backend Test Suite | 0/3 | Not started | - |
| 6. Frontend & E2E Tests | 0/3 | Not started | - |
