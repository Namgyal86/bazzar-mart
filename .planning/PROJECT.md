# Bazzar Mart — Quality & Reliability Milestone

## What This Is

Bazzar Mart is a full-stack e-commerce platform targeting the Nepali market, with Khalti/eSewa payment integration, real-time delivery tracking, and multi-role dashboards for buyers, sellers, and admins. The platform runs as a hybrid monolith + microservices backend (Express), a Next.js web frontend, and four Flutter mobile apps. This milestone focuses on hardening the existing codebase: closing security gaps, completing broken flows, adding full test coverage, and fixing performance issues across all layers.

## Core Value

Every user interaction — from auth to checkout to delivery — must work correctly, securely, and without silent failures.

## Requirements

### Validated

<!-- Existing capabilities confirmed working from codebase analysis -->

- ✓ User registration and JWT-based login with access/refresh token pair — existing
- ✓ Role-based access control (BUYER / SELLER / ADMIN / DELIVERY) — existing
- ✓ Product catalog with categories and Elasticsearch search — existing
- ✓ Redis-backed cart with 30-day TTL — existing
- ✓ Order creation with atomic per-item stock decrement — existing
- ✓ Khalti payment initiation and callback verification — existing
- ✓ eSewa payment integration — existing
- ✓ Coupon and referral wallet system (partially working) — existing
- ✓ Real-time delivery tracking via Socket.io — existing
- ✓ Kafka event bus for async cross-service communication — existing
- ✓ In-process typed EventEmitter (internalBus) for monolith module comms — existing
- ✓ Push / SMS (Sparrow) / email (SendGrid) notifications — existing
- ✓ Seller dashboard: products, orders, analytics, inventory, payouts — existing
- ✓ Admin console: users, sellers, products, coupons, banners, referrals, support — existing
- ✓ Next.js API proxy rewrites (no CORS from browser) — existing
- ✓ Flutter mobile apps: buyer, seller admin, delivery agent — existing
- ✓ Docker Compose local dev stack + Kubernetes + Terraform AWS infra — existing

### Active

<!-- Security -->
- [ ] **SEC-01**: Block ADMIN role self-assignment at registration endpoint
- [ ] **SEC-02**: Remove blind trust of x-user-id/x-user-role headers in auth middleware (require JWT verification when Kong headers absent)
- [ ] **SEC-03**: Restrict CORS on delivery-service and notification-service to known frontend origin (not wildcard)
- [ ] **SEC-04**: Sanitize error responses in production (no stack traces or DB errors exposed)
- [ ] **SEC-05**: Add JWT verification to protected delivery-service routes (complete, driver assignment)
- [ ] **SEC-06**: Switch Morgan to `combined` format in production; use `dev` only in development

<!-- Broken / Incomplete Features -->
- [ ] **FEAT-01**: Implement password reset flow — POST /auth/password/forgot + POST /auth/password/reset with time-limited signed token and email delivery
- [ ] **FEAT-02**: Implement email verification — send verification link on registration, gate checkout/seller-register on isEmailVerified
- [ ] **FEAT-03**: Complete wallet credit deduction on order creation (currently shown but never consumed)
- [ ] **FEAT-04**: Restore stock on order cancellation (currently permanently decremented on cancel)
- [ ] **FEAT-05**: Replace hardcoded BAZZAR10 coupon with seeded Coupon document with proper limits/expiry
- [ ] **FEAT-06**: Fix seller analytics — replace hardcoded prev-period multipliers with real historical query
- [ ] **FEAT-07**: Add Zod validation to seller product creation endpoint (prevent field injection)
- [ ] **FEAT-08**: Persist delivery service state to MongoDB (replace in-memory array); gate GPS simulation behind NODE_ENV check
- [ ] **FEAT-09**: Make referral bonus handler idempotent (use findOneAndUpdate with status filter before crediting)

<!-- Performance -->
- [ ] **PERF-01**: Replace JS-level seller analytics aggregation with MongoDB $aggregate pipeline
- [ ] **PERF-02**: Add proper pagination (page/limit with max cap) to review, support message, and seller review endpoints
- [ ] **PERF-03**: Fix seller dashboard 7-day revenue chart to query correct date range (not just last 5 orders)
- [ ] **PERF-04**: Add MongoDB index on orders.items.sellerId for seller query performance

<!-- Reliability -->
- [ ] **REL-01**: Add structured error logging to internalBus handlers; persist failed events for replay on critical paths
- [ ] **REL-02**: Replace silent Kafka publish catch blocks with WARN-level logging including topic and payload
- [ ] **REL-03**: Wrap order creation (stock decrement + Order.create) in a MongoDB session/transaction

<!-- Testing — Backend -->
- [ ] **TEST-01**: Set up Jest + Supertest test infrastructure for api-monolith
- [ ] **TEST-02**: Auth flow tests: register (including ADMIN role block), login, token refresh, logout
- [ ] **TEST-03**: Order flow tests: create order, stock decrement, cancel + stock restore, coupon validation
- [ ] **TEST-04**: Payment tests: Khalti callback verification, eSewa signature verification
- [ ] **TEST-05**: Referral tests: idempotent bonus crediting, wallet deduction on order
- [ ] **TEST-06**: Security tests: header-based auth bypass blocked, role escalation blocked

<!-- Testing — Frontend Web -->
- [ ] **TEST-07**: Set up Vitest + Testing Library for Next.js components
- [ ] **TEST-08**: Auth page tests: login form, register form, forgot-password form
- [ ] **TEST-09**: Buyer flow tests: product browse → cart → checkout → payment redirect
- [ ] **TEST-10**: Seller dashboard tests: product creation form validation, analytics display

<!-- Testing — E2E -->
- [ ] **TEST-11**: Set up Playwright for E2E testing against the full stack
- [ ] **TEST-12**: E2E: buyer registers → logs in → adds to cart → checks out
- [ ] **TEST-13**: E2E: seller logs in → creates product → views orders

### Out of Scope

- Real-time chat between buyer and seller — high complexity, not blocking any current flow
- Mobile app (Flutter) automated testing — Flutter testing requires separate toolchain; tracked separately
- OAuth / social login — email/password sufficient for this milestone
- New feature development beyond completing already-started features — focus is quality, not expansion
- Elasticsearch relevance tuning — search works; ranking optimization is a separate concern

## Context

The codebase was mapped on 2026-04-14. Key findings that drive this milestone:

- **Zero test coverage** across all services and the web frontend — no .test.ts or .spec.ts files found anywhere
- **5 critical security vulnerabilities** documented in .planning/codebase/CONCERNS.md
- **8 broken or incomplete features** — password reset UI calls a non-existent API, wallet credits are never consumed, stock doesn't restore on cancel, etc.
- **4 performance bottlenecks** — unbounded in-memory aggregations, missing DB indexes
- **4 fragile areas** — silent event drops on Kafka failure, non-idempotent referral handler, GPS simulation in production

Tech stack: TypeScript/Node.js (api-monolith, delivery, notification), Next.js 14 (web), Flutter/Dart (mobile), MongoDB + Redis + Kafka + Elasticsearch, Khalti + eSewa payments, AWS EKS production deployment.

## Constraints

- **Tech Stack**: No framework changes — Express, Next.js 14, MongoDB/Mongoose, Zustand, Kafka. All fixes extend existing patterns
- **Compatibility**: MongoDB must run in replica-set mode for transactions (already the case in production; local docker-compose may need update)
- **Payments**: Khalti and eSewa integration must not break — payment callback flows are critical revenue paths
- **Mobile**: Flutter apps are out of scope for automated testing in this milestone — they target the same API so backend fixes cover the critical paths

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Jest + Supertest for backend tests | Matches existing Node.js/TS toolchain; Supertest lets us test HTTP layer without a running server | — Pending |
| Vitest + Testing Library for web | Faster than Jest for Next.js; official recommendation for Vite-adjacent stacks | — Pending |
| Playwright for E2E | Industry standard; works with Next.js dev server; supports parallel test runs | — Pending |
| Fix features before adding tests | Tests for broken features will fail — better to fix first, then lock in correct behavior with tests | — Pending |
| MongoDB transactions for order creation | Requires replica set; production already uses DocumentDB (replica set). Local docker-compose needs `--replSet` flag added | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-14 after initialization*
