---
phase: 01-security-hardening
plan: 03
subsystem: api-monolith
tags: [security, error-handling, logging, information-disclosure]
dependency_graph:
  requires: []
  provides: [sanitized-error-responses, env-conditional-morgan]
  affects: [api-monolith-all-controllers, api-monolith-app]
tech_stack:
  added: []
  patterns: [handleError-helper, env-conditional-middleware]
key_files:
  created: []
  modified:
    - services/api-monolith/src/shared/middleware/error.ts
    - services/api-monolith/src/modules/users/user.controller.ts
    - services/api-monolith/src/modules/users/auth.controller.ts
    - services/api-monolith/src/modules/orders/order.controller.ts
    - services/api-monolith/src/modules/payments/payment.controller.ts
    - services/api-monolith/src/modules/sellers/seller.controller.ts
    - services/api-monolith/src/modules/reviews/review.controller.ts
    - services/api-monolith/src/modules/referrals/referral.controller.ts
    - services/api-monolith/src/modules/cart/cart.controller.ts
    - services/api-monolith/src/modules/support/support.controller.ts
    - services/api-monolith/src/modules/storefront/storefront.controller.ts
    - services/api-monolith/src/modules/search/search.controller.ts
    - services/api-monolith/src/modules/recommendations/recommendation.controller.ts
    - services/api-monolith/src/modules/products/product.controller.ts
    - services/api-monolith/src/modules/analytics/analytics.controller.ts
    - services/api-monolith/src/app.ts
decisions:
  - "handleError centralizes ZodError detection (400) and production sanitization (500) so controllers need zero branching logic in catch blocks"
  - "Morgan 'combined' in production prevents PII in URL query strings from appearing in log aggregators"
metrics:
  duration: ~20min
  completed: 2026-04-15
  tasks_completed: 2
  files_modified: 16
---

# Phase 01 Plan 03: Error Response Sanitization and Morgan Config Summary

Centralized error handling across the API monolith: production 500 responses now return a generic message with no internal detail, and Morgan logs in `combined` format in production to avoid PII leakage in query strings.

## Tasks Completed

### Task 1: Create handleError helper and sanitize all error responses

**Commit:** fac1d62

Updated `services/api-monolith/src/shared/middleware/error.ts`:
- Added `import { env } from '../../config/env'`
- Exported new `handleError(err, res)` helper that: logs full error server-side, detects ZodError and returns 400, returns generic "Internal server error" in production, returns actual message in development
- Updated global `errorHandler` middleware to apply same production sanitization

Replaced all 14 inline catch block patterns across controllers. Each controller now imports `handleError` and uses `handleError(err, res)` instead of `res.status(500).json({ success: false, error: (err as Error).message })`. The ZodError+500 compound pattern in auth, orders, and products controllers was also consolidated into the single `handleError` call.

All 400/401/403/404 responses remain untouched across all files.

### Task 2: Configure Morgan for environment-specific format

**Commit:** b16a69e

Single-line change in `services/api-monolith/src/app.ts`:
- `morgan('dev')` → `morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev')`

## Verification Results

- `handleError` exported from error.ts: PASS
- env imported, production check present: PASS
- Remaining inline 500 patterns across all 14 controllers: 0
- Morgan has conditional format with 'combined' string: PASS
- `npx tsc --noEmit`: EXIT 0 (clean compile)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no stub patterns introduced by this plan.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. This plan only modifies existing error response paths and logging configuration.

## Self-Check: PASSED

- `services/api-monolith/src/shared/middleware/error.ts`: FOUND
- `services/api-monolith/src/app.ts`: FOUND (morgan conditional)
- Commit fac1d62: verified via git log
- Commit b16a69e: verified via git log
