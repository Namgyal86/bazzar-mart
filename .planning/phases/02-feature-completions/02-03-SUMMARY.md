---
plan: 02-03
phase: 02-feature-completions
status: complete
completed_at: 2026-04-15
tasks_completed: 2
tasks_total: 2
self_check: PASSED
---

## Summary

Three data-correctness fixes delivered in `api-monolith`: hardcoded BAZZAR10 coupon branch removed and replaced with a seeded DB document; fake analytics multipliers replaced with a real prior-period query; Zod validation added to the seller product creation endpoint.

## What Was Built

### Task 1: Remove BAZZAR10 hardcoded branches + coupon seed script

**`services/api-monolith/src/modules/orders/order.controller.ts`**
- Removed the `if (code === 'BAZZAR10') { discount = subtotal * 0.1 }` branch from `createOrder` — all coupon codes now go through the unified DB path with `usageLimit`, `validUntil`, and `minOrder` checks
- Removed the identical early-return branch from `validateCoupon`

**`services/api-monolith/scripts/seed-coupons.ts`** (new file)
- Upserts a `BAZZAR10` Coupon document: `type: PERCENTAGE`, `value: 10`, `usageLimit: 1000`, `minOrder: 500`, `validUntil: +1 year`, `isActive: true`
- Uses `findOneAndUpdate` with `upsert: true` — idempotent, safe to re-run

**`services/api-monolith/package.json`**
- Added `"seed:coupons": "ts-node scripts/seed-coupons.ts"` script

### Task 2: Real prior-period analytics + Zod-validated product creation

**`services/api-monolith/src/modules/sellers/seller.controller.ts`**
- Added `import { z } from 'zod'`
- Added `createSellerProductSchema` Zod schema (allows name, description, price, stock, images, category, brand, tags, specifications, sellerName; excludes `isFeatured` and `sellerId`)
- Updated `createSellerProduct` to call `createSellerProductSchema.parse(req.body)` — missing required fields return 400 with Zod error
- Replaced fake `prev: Math.round(totalRevenue * 0.85), change: 15` multipliers in `getSellerAnalytics` with a real second DB query (`prevSince` = 12 months ago, `prevEnd` = 6 months ago) that computes actual revenue, order count, unique customers, and avg order for the prior period

## Key Files

### Created
- `services/api-monolith/scripts/seed-coupons.ts` — BAZZAR10 coupon upsert seed script

### Modified
- `services/api-monolith/src/modules/orders/order.controller.ts` — BAZZAR10 hardcode removed from createOrder + validateCoupon
- `services/api-monolith/src/modules/sellers/seller.controller.ts` — real prior-period analytics; Zod-validated product creation
- `services/api-monolith/package.json` — seed:coupons script added

## Commits

- `aa0832b` feat(02-03): remove hardcoded BAZZAR10 branch, add coupon seed script
- `93c0015` feat(02-03): real prior-period analytics query + Zod validation on seller product creation

## Self-Check

- [x] `order.controller.ts` contains no `=== 'BAZZAR10'` — PASSED
- [x] `seed-coupons.ts` contains `BAZZAR10`, `upsert: true`, `usageLimit: 1000`, `minOrder: 500` — PASSED
- [x] `seller.controller.ts` contains `prevSince` and `createSellerProductSchema` — PASSED
- [x] No hardcoded `change: 15 / 10 / 8 / 5` multipliers remain — PASSED
- [x] `npx tsc --noEmit` exits 0 — PASSED

## Requirements Addressed

- FEAT-05: Coupon validation goes through DB — BAZZAR10 now subject to usageLimit and expiry
- FEAT-06: Analytics prev/change values derived from real prior-period DB query
- FEAT-07: Seller product creation validates input with Zod before `Product.create`
