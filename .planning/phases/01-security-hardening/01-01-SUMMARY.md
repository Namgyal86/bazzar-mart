---
phase: 01-security-hardening
plan: 01
subsystem: auth
tags: [jwt, express, middleware, zod, role-based-access]

requires: []
provides:
  - JWT-only authenticate middleware (Kong header bypass removed)
  - Registration schema restricted to BUYER and SELLER roles only
affects: [02-security-hardening, testing]

tech-stack:
  added: []
  patterns:
    - "All authentication exclusively via Authorization: Bearer JWT — no trusted internal headers"
    - "Zod enum restriction as the sole guard for role self-assignment at registration"

key-files:
  created: []
  modified:
    - services/api-monolith/src/shared/middleware/auth.ts
    - services/api-monolith/src/modules/users/auth.controller.ts

key-decisions:
  - "Kong header bypass removed entirely — no fallback, no logging path; full JWT requirement on every protected route"
  - "No post-parse guard needed for role restriction — Zod enum parse throws ZodError, existing catch returns 400"

patterns-established:
  - "authenticate() is ~12 lines: header check + try/catch jwt.verify — the canonical pattern for all services"

requirements-completed: [SEC-01, SEC-02]

duration: 3min
completed: 2026-04-14
---

# Phase 01 Plan 01: Auth Hardening Summary

**Kong header identity bypass removed and registration role enum restricted to BUYER/SELLER, closing the two highest-severity API security vulnerabilities**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-14T16:28:24Z
- **Completed:** 2026-04-14T16:31:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Removed the Kong gateway header shortcut (`x-user-id` / `x-user-role`) from `authenticate()` — every request now requires a valid JWT; identity spoofing via internal headers is no longer possible
- Restricted `registerSchema` role enum from `['BUYER', 'SELLER', 'ADMIN', 'DELIVERY']` to `['BUYER', 'SELLER']` — ADMIN and DELIVERY self-assignment now returns 400 via Zod validation
- TypeScript compiles cleanly with no errors after both changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove Kong header bypass from authenticate middleware** - `5601571` (fix)
2. **Task 2: Restrict registration schema to BUYER and SELLER only** - `bd3e52f` (fix)

## Files Created/Modified

- `services/api-monolith/src/shared/middleware/auth.ts` - Removed lines 17-24 (Kong header block); authenticate() is now JWT-only
- `services/api-monolith/src/modules/users/auth.controller.ts` - Changed role enum from 4 values to `['BUYER', 'SELLER']`

## Decisions Made

- Kong header bypass removed entirely with no replacement — no logging path, no fallback. The comment was also cleaned to avoid leaving the header names as searchable strings.
- No additional post-parse guard needed for role restriction — Zod enum restriction alone is sufficient; existing ZodError catch block returns 400 with field-level detail.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed `x-user-id` string from comment to pass verification**
- **Found during:** Task 1 verification
- **Issue:** The initial comment I wrote included `x-user-id` in the text, causing the automated grep-based verification to fail (`src.includes("x-user-id")` returned true)
- **Fix:** Rewrote the file-header comment to omit the header name strings while preserving the security rationale
- **Files modified:** services/api-monolith/src/shared/middleware/auth.ts
- **Verification:** Verification script re-ran and passed (PASS)
- **Committed in:** 5601571 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - comment wording causing false positive in verification)
**Impact on plan:** Trivial fix. No scope creep. Security intent unchanged.

## Issues Encountered

- `npx tsc --noEmit` resolved to an unrelated `tsc` npm package (not TypeScript compiler) because `node_modules` was not yet installed. Ran `npm install` first to get the local TypeScript binary, then used `node_modules/.bin/tsc --noEmit` — compiled cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Authentication layer is now hardened — ready for Phase 01-02 (CORS hardening on delivery-service and notification-service)
- No blockers introduced by these changes
- `optionalAuth` and `requireRole` were not touched and remain correct

---
*Phase: 01-security-hardening*
*Completed: 2026-04-14*

## Self-Check: PASSED

- FOUND: services/api-monolith/src/shared/middleware/auth.ts
- FOUND: services/api-monolith/src/modules/users/auth.controller.ts
- FOUND: .planning/phases/01-security-hardening/01-01-SUMMARY.md
- FOUND commit: 5601571 (Task 1)
- FOUND commit: bd3e52f (Task 2)
