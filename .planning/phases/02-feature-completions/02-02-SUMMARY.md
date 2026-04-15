---
phase: 02-feature-completions
plan: "02"
subsystem: api
tags: [mongodb, mongoose, orders, wallet, stock, atomic-update]

# Dependency graph
requires:
  - phase: 02-feature-completions
    provides: Order and Wallet models, referral module with Wallet schema
provides:
  - Atomic wallet balance deduction on order creation with $gte guard and full rollback
  - Stock quantity restoration on order cancellation via per-item Promise.all
affects: [02-03, 02-04, testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic MongoDB findOneAndUpdate with $gte filter for TOCTOU-safe balance deduction"
    - "Promise.all with per-item .catch for fault-tolerant stock restore"
    - "Nested try/catch for Order.create with full compensation (stock + wallet rollback)"

key-files:
  created: []
  modified:
    - services/api-monolith/src/modules/orders/order.controller.ts

key-decisions:
  - "walletAmount deducted after stock decrement succeeds to keep atomic deduction in correct order"
  - "finalTotal = total - walletAmount stored on Order; events emit finalTotal not gross total"
  - "Per-item stock restore failures are logged but do not block cancel response (per D-14)"
  - "walletAmount field omitted from Order document (not in schema) — deduction is the source of truth"

patterns-established:
  - "Compensation pattern: atomic op after stock decrement; rollback both on downstream failure"
  - "TOCTOU guard: server pre-check + atomic findOneAndUpdate with $gte; 409 on race loss"

requirements-completed: [FEAT-03, FEAT-04]

# Metrics
duration: 15min
completed: 2026-04-15
---

# Phase 02 Plan 02: Wallet Deduction and Stock Restore Summary

**Atomic wallet balance deduction on checkout using MongoDB $gte guard, with full compensation rollback and per-item stock restore on cancellation**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-15T08:30:00Z
- **Completed:** 2026-04-15T08:45:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Wallet model imported into order controller; walletAmount added to createOrderSchema (Zod, min 0, default 0)
- Pre-check validates wallet balance before any stock is decremented
- Atomic wallet deduction after stock decrement using `Wallet.findOneAndUpdate({ balance: { $gte: walletAmount } })` — returns null if balance lost in race, triggers 409 with stock rollback
- Order.create wrapped in try/catch: on failure, stock rolled back AND wallet refunded with CREDIT transaction record
- finalTotal (total minus walletAmount) stored on Order and emitted to Kafka/internalBus
- cancelOrder restores stock for every item via `Promise.all` before `order.save()`; per-item `.catch` logs failures without blocking the cancel response

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Wallet deduction in createOrder + Stock restore in cancelOrder** - `837abe6` (feat)

**Plan metadata:** (docs commit to follow from orchestrator)

## Files Created/Modified
- `services/api-monolith/src/modules/orders/order.controller.ts` - Added Wallet import, walletAmount schema field, pre-check, atomic deduction, Order.create rollback wrapper, and cancelOrder stock restore

## Decisions Made
- Wallet deduction placed after stock decrement (not before) so stock is already locked when wallet is deducted — reduces window for inconsistency
- `finalTotal` computed as `Math.max(0, total - walletAmount)` and used throughout (Order.create, internalBus, Kafka) so downstream consumers see the true amount charged
- walletAmount field NOT added to Order schema (not in IOrder interface) — the Wallet transaction log is the source of truth for what was deducted
- Per-item stock restore uses individual `.catch` rather than top-level `.catch` on Promise.all so each item's failure is independently logged

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript compiled clean (zero errors) on first attempt.

## Known Stubs
None — both side effects are fully wired to real MongoDB documents.

## Threat Flags
None — all trust boundaries addressed: T-02.02-01 (Zod min(0) validation), T-02.02-02 (atomic $gte guard), T-02.02-03 (existing userId ownership check), T-02.02-04 (per-item catch without blocking).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wallet deduction and stock restore are production-ready
- Phase 02-03 (seller analytics) and 02-04 (delivery persistence) can proceed independently
- Testing phase (03) can now write meaningful order flow tests against correct behavior

## Self-Check

- [x] `services/api-monolith/src/modules/orders/order.controller.ts` modified and committed
- [x] Commit `837abe6` present in git log
- [x] TypeScript compiles with zero errors
- [x] All acceptance criteria met: Wallet import, walletAmount schema, $gte guard, Insufficient wallet balance message, wallet rollback string, stock restore comment, $inc stock item.quantity pattern

## Self-Check: PASSED

---
*Phase: 02-feature-completions*
*Completed: 2026-04-15*
