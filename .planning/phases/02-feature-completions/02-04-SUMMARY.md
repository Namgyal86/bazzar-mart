---
phase: 02-feature-completions
plan: "04"
subsystem: delivery-service, api-monolith/referrals
tags: [persistence, idempotency, gps-simulation, kafka, mongoose]
requirements: [FEAT-08, FEAT-09]

dependency_graph:
  requires: []
  provides:
    - delivery-service MongoDB persistence (IDelivery model)
    - Idempotent referral ORDER_CREATED handler
  affects:
    - services/delivery-service/src/index.ts
    - services/delivery-service/src/kafka/consumers/index.ts
    - services/api-monolith/src/modules/referrals/referral.controller.ts

tech_stack:
  added:
    - services/delivery-service/src/models/delivery.model.ts (new Mongoose model)
  patterns:
    - findOneAndUpdate with $setOnInsert for idempotent Kafka upserts
    - findOneAndUpdate with status filter for atomic CAS (compare-and-swap)
    - NODE_ENV guard for development-only simulations

key_files:
  created:
    - services/delivery-service/src/models/delivery.model.ts
  modified:
    - services/delivery-service/src/index.ts
    - services/delivery-service/src/kafka/consumers/index.ts
    - services/api-monolith/src/modules/referrals/referral.controller.ts

decisions:
  - "Used createDeliveryModel(conn) factory pattern so model is registered against the already-open connection, avoiding mongoose.model duplicate registration errors"
  - "Kafka consumer kept using the Delivery model (not the raw deliverytasks collection) to unify persistence through the same schema"
  - "findOneAndUpdate { new: false } in referral handler confirms atomic claim — null means another execution already won"

metrics:
  duration: "~20 minutes"
  completed: "2026-04-15"
  tasks_completed: 2
  files_modified: 4
  files_created: 1
---

# Phase 02 Plan 04: Delivery Persistence + Idempotent Referral Handler Summary

**One-liner:** MongoDB-backed Delivery model replaces in-memory array in delivery-service; atomic findOneAndUpdate CAS prevents duplicate wallet credits in referral handler.

## What Was Built

### Task 1: Delivery Mongoose Model + Route Handler Updates + GPS Gate

**New file:** `services/delivery-service/src/models/delivery.model.ts`

Defines `IDelivery` interface and `DeliverySchema` with indexes on `status` and `driverId`. Exports `createDeliveryModel(conn)` factory so the model is registered after `mongoose.connect()` resolves, avoiding duplicate-model registration errors.

**Updated:** `services/delivery-service/src/index.ts`

- Removed `const deliveries: any[] = []` entirely
- All six route handlers (admin/list, admin/stats, assign, agent/orders, orders/:orderId, orders/:orderId/complete) now use `Delivery.find`, `Delivery.findOne`, `Delivery.findOneAndUpdate`, `Delivery.countDocuments`
- Removed `loadDeliveriesFromOrders()` function and its startup call — DB persistence makes startup seeding from the orders collection redundant
- GPS `setInterval` wrapped in `if (process.env.NODE_ENV !== 'production')` — fake coordinates no longer broadcast to real buyers in production

**Updated:** `services/delivery-service/src/kafka/consumers/index.ts`

- Replaced raw `db.collection('deliverytasks').insertOne(...)` with `Delivery.findOneAndUpdate({ orderId }, { $setOnInsert: {...} }, { upsert: true })` — idempotent, prevents duplicate delivery records if Kafka event fires twice (T-02.04-05)

### Task 2: Idempotent Referral ORDER_CREATED Handler

**Updated:** `services/api-monolith/src/modules/referrals/referral.controller.ts`

Replaced two-step `findOne` + `referral.save()` pattern with a single atomic `findOneAndUpdate`:

```typescript
const referral = await Referral.findOneAndUpdate(
  { referredId: p.userId, status: 'PENDING' },
  { $set: { status: 'COMPLETED', completedAt: new Date() } },
  { new: false },
);
if (!referral) return; // already claimed or no referral exists
```

Only one concurrent handler execution can transition the status from PENDING → COMPLETED. Subsequent executions receive `null` and exit without crediting wallets.

## Commits

| Hash | Message |
|------|---------|
| `6e47b08` | feat(02-04): persist delivery state to MongoDB + gate GPS simulation |
| `1468dd7` | chore(02-04): restore accidentally deleted plan files |
| `89fc131` | fix(02-04): make referral ORDER_CREATED handler idempotent |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kafka consumer used raw collection instead of Delivery model**
- **Found during:** Task 1 — reading `services/delivery-service/src/kafka/consumers/index.ts`
- **Issue:** The plan said to update the Kafka consumer to use `Delivery.findOneAndUpdate` for persistence, but the consumer was writing to a separate raw `deliverytasks` collection, bypassing the new model
- **Fix:** Updated consumer to import and use `createDeliveryModel` with `$setOnInsert` upsert pattern, unifying all persistence through the Delivery model
- **Files modified:** `services/delivery-service/src/kafka/consumers/index.ts`
- **Commit:** `6e47b08`

**2. [Rule 3 - Blocking] node_modules missing in delivery-service**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `npx tsc --noEmit` failed with "Cannot find module 'socket.io'" because `node_modules` was absent in the worktree
- **Fix:** Ran `npm install` in `services/delivery-service`
- **Commit:** N/A (dependency install, no committed files)

**3. [Rule 3 - Blocking] Soft reset left plan files staged as deletions**
- **Found during:** Task 1 commit
- **Issue:** The worktree branch initialization used `git reset --soft` to reach the target commit; this left the plan files (.planning/phases/02-feature-completions/02-0*.md) staged as deletions which were accidentally included in the Task 1 commit
- **Fix:** Extracted files from git history and committed them back in a separate restore commit
- **Commit:** `1468dd7`

## Known Stubs

None — all route handlers query live MongoDB data. No hardcoded empty values flow to UI.

## Threat Flags

None — no new network endpoints or trust boundaries introduced beyond what the plan's threat model covers.

## Self-Check

Files created/modified:
- [x] `services/delivery-service/src/models/delivery.model.ts` — exists
- [x] `services/delivery-service/src/index.ts` — contains `Delivery.find`, `NODE_ENV !== 'production'`, no `deliveries[]`
- [x] `services/delivery-service/src/kafka/consumers/index.ts` — uses Delivery model with `$setOnInsert`
- [x] `services/api-monolith/src/modules/referrals/referral.controller.ts` — contains `findOneAndUpdate` with `status: 'PENDING'` filter

Commits verified: `6e47b08`, `1468dd7`, `89fc131`

TypeScript: zero errors in both `delivery-service` and `api-monolith`

## Self-Check: PASSED
