# Requirements: Bazzar Mart — Quality & Reliability Milestone

## Overview

This milestone is a brownfield hardening pass on an existing e-commerce platform. No new product features are introduced. Work covers six areas: closing security vulnerabilities, completing broken/incomplete features, adding data-integrity and reliability guarantees, fixing performance bottlenecks, and establishing full test coverage across backend, web frontend, and E2E layers.

## Categories

### Security (SEC)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| SEC-01 | Block ADMIN role self-assignment at registration endpoint | v1 | Pending |
| SEC-02 | Remove blind trust of x-user-id/x-user-role headers in auth middleware (require JWT verification when Kong headers absent) | v1 | Pending |
| SEC-03 | Restrict CORS on delivery-service and notification-service to known frontend origin (not wildcard) | v1 | Pending |
| SEC-04 | Sanitize error responses in production (no stack traces or DB errors exposed to client) | v1 | Pending |
| SEC-05 | Add JWT verification to protected delivery-service routes (complete, driver assignment) | v1 | Pending |
| SEC-06 | Switch Morgan to `combined` format in production; use `dev` only in development | v1 | Pending |

### Features / Bug Fixes (FEAT)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FEAT-01 | Implement password reset flow — POST /auth/password/forgot + POST /auth/password/reset with time-limited signed token and email delivery | v1 | Pending |
| FEAT-02 | Implement email verification — send verification link on registration, gate checkout and seller-register on isEmailVerified | v1 | Pending |
| FEAT-03 | Complete wallet credit deduction on order creation (currently shown but never consumed) | v1 | Pending |
| FEAT-04 | Restore stock on order cancellation (currently permanently decremented on cancel) | v1 | Pending |
| FEAT-05 | Replace hardcoded BAZZAR10 coupon with seeded Coupon document with proper limits and expiry | v1 | Pending |
| FEAT-06 | Fix seller analytics — replace hardcoded prev-period multipliers with real historical query | v1 | Pending |
| FEAT-07 | Add Zod validation to seller product creation endpoint (prevent field injection) | v1 | Pending |
| FEAT-08 | Persist delivery service state to MongoDB (replace in-memory array); gate GPS simulation behind NODE_ENV check | v1 | Pending |
| FEAT-09 | Make referral bonus handler idempotent (use findOneAndUpdate with status filter before crediting) | v1 | Pending |

### Performance (PERF)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| PERF-01 | Replace JS-level seller analytics aggregation with MongoDB $aggregate pipeline | v1 | Pending |
| PERF-02 | Add proper pagination (page/limit with max cap) to review, support message, and seller review endpoints | v1 | Pending |
| PERF-03 | Fix seller dashboard 7-day revenue chart to query correct date range (not just last 5 orders) | v1 | Pending |
| PERF-04 | Add MongoDB index on orders.items.sellerId for seller query performance | v1 | Pending |

### Reliability (REL)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| REL-01 | Add structured error logging to internalBus handlers; persist failed events for replay on critical paths | v1 | Pending |
| REL-02 | Replace silent Kafka publish catch blocks with WARN-level logging including topic and payload | v1 | Pending |
| REL-03 | Wrap order creation (stock decrement + Order.create) in a MongoDB session/transaction | v1 | Pending |

### Testing — Backend (TEST-Backend)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| TEST-01 | Set up Jest + Supertest test infrastructure for api-monolith | v1 | Pending |
| TEST-02 | Auth flow tests: register (including ADMIN role block), login, token refresh, logout | v1 | Pending |
| TEST-03 | Order flow tests: create order, stock decrement, cancel + stock restore, coupon validation | v1 | Pending |
| TEST-04 | Payment tests: Khalti callback verification, eSewa signature verification | v1 | Pending |
| TEST-05 | Referral tests: idempotent bonus crediting, wallet deduction on order | v1 | Pending |
| TEST-06 | Security tests: header-based auth bypass blocked, role escalation blocked | v1 | Pending |

### Testing — Frontend Web (TEST-Web)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| TEST-07 | Set up Vitest + Testing Library for Next.js components | v1 | Pending |
| TEST-08 | Auth page tests: login form, register form, forgot-password form | v1 | Pending |
| TEST-09 | Buyer flow tests: product browse → cart → checkout → payment redirect | v1 | Pending |
| TEST-10 | Seller dashboard tests: product creation form validation, analytics display | v1 | Pending |

### Testing — E2E (TEST-E2E)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| TEST-11 | Set up Playwright for E2E testing against the full stack | v1 | Pending |
| TEST-12 | E2E: buyer registers → logs in → adds to cart → checks out | v1 | Pending |
| TEST-13 | E2E: seller logs in → creates product → views orders | v1 | Pending |

## Out of Scope

- Real-time buyer–seller chat
- Flutter mobile automated testing (separate toolchain, tracked separately)
- OAuth / social login
- New feature development beyond completing already-started features
- Elasticsearch relevance tuning

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| SEC-06 | Phase 1 | Pending |
| FEAT-01 | Phase 2 | Pending |
| FEAT-02 | Phase 2 | Pending |
| FEAT-03 | Phase 2 | Pending |
| FEAT-04 | Phase 2 | Pending |
| FEAT-05 | Phase 2 | Pending |
| FEAT-06 | Phase 2 | Pending |
| FEAT-07 | Phase 2 | Pending |
| FEAT-08 | Phase 2 | Pending |
| FEAT-09 | Phase 2 | Pending |
| REL-01 | Phase 3 | Pending |
| REL-02 | Phase 3 | Pending |
| REL-03 | Phase 3 | Pending |
| PERF-04 | Phase 3 | Pending |
| PERF-01 | Phase 4 | Pending |
| PERF-02 | Phase 4 | Pending |
| PERF-03 | Phase 4 | Pending |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 5 | Pending |
| TEST-04 | Phase 5 | Pending |
| TEST-05 | Phase 5 | Pending |
| TEST-06 | Phase 5 | Pending |
| TEST-07 | Phase 6 | Pending |
| TEST-08 | Phase 6 | Pending |
| TEST-09 | Phase 6 | Pending |
| TEST-10 | Phase 6 | Pending |
| TEST-11 | Phase 6 | Pending |
| TEST-12 | Phase 6 | Pending |
| TEST-13 | Phase 6 | Pending |
