# Phase 2: Feature Completions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-15
**Phase:** 02-feature-completions
**Mode:** discuss
**Areas discussed:** Email infrastructure, Wallet deduction + atomicity, BAZZAR10 coupon seed

## Gray Areas Presented

| Area | Selected for Discussion |
|------|------------------------|
| Email infrastructure (FEAT-01, FEAT-02) | ✓ Yes |
| Checkout verification gate (FEAT-02) | ✗ Skipped — Claude's discretion |
| Wallet deduction + atomicity (FEAT-03) | ✓ Yes |
| BAZZAR10 coupon seed (FEAT-05) | ✓ Yes |

## Decisions Made

### Email Infrastructure

| Question | Answer |
|----------|--------|
| How to send emails? | SendGrid SDK directly from api-monolith (not via Kafka/notification-service) |
| Where to store tokens? | Fields on User model (passwordResetToken, passwordResetExpiry, emailVerificationToken, emailVerificationExpiry) |

### Wallet Deduction

| Question | Answer |
|----------|--------|
| Where does wallet deduction fit? | After stock decrement, before Order.create, with best-effort rollback (matches existing pattern) |
| What if wallet balance is insufficient? | Reject with 400 — no partial credit |

### BAZZAR10 Coupon

| Question | Answer |
|----------|--------|
| Coupon limits? | 10% off, usageLimit=1000, validUntil=1 year from run date, minOrder=500 NPR |
| Seed mechanism? | npm run seed:coupons — standalone script at scripts/seed-coupons.ts (upsert, re-runnable) |

## Areas Deferred to Claude's Discretion

- **Checkout gate behavior** — API-layer 400 on isEmailVerified=false (straightforward from requirement)
- **Seller analytics query** — real historical query replacing hardcoded multipliers (implementation obvious from CONCERNS.md)
- **Product Zod validation (FEAT-07)** — validation already exists in code; verify no bypass path
- **Delivery MongoDB model** — persist to delivery_db using existing connection
- **Referral idempotency** — atomic findOneAndUpdate with status:'PENDING' filter
- **Email helper extraction** — shared sendEmail() utility in shared/services/email.ts (recommended)

## No Corrections Made

All selections were the recommended/first options.
