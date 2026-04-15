---
phase: 01-security-hardening
verified: 2026-04-15T00:00:00Z
status: gaps_found
score: 8/13 must-haves verified
overrides_applied: 0
gaps:
  - truth: "A request carrying x-user-id and x-user-role headers but no JWT is rejected with 401"
    status: failed
    reason: "Kong header bypass was removed in commit 5601571 but re-introduced in commit a95dd92 (the Plan 01-02 CORS executor ran from the original base commit before 01-01 changes, and its merge reverted auth.ts to the pre-fix state). Current auth.ts lines 17-24 still read x-user-id and x-user-role headers and bypass JWT verification when both are present."
    artifacts:
      - path: "services/api-monolith/src/shared/middleware/auth.ts"
        issue: "Lines 17-24 still read x-user-id/x-user-role headers and call next() without JWT — the exact bypass that was supposed to be deleted"
    missing:
      - "Delete lines 17-24 from authenticate() in auth.ts (the kongUserId/kongUserRole block)"
      - "Update comment to reflect JWT-only authentication"

  - truth: "A registration request with role ADMIN in the body is rejected with 400"
    status: failed
    reason: "registerSchema enum was fixed to ['BUYER', 'SELLER'] in commit bd3e52f but reverted back to ['BUYER', 'SELLER', 'ADMIN', 'DELIVERY'] in commit a95dd92 (same worktree revert incident). Current auth.controller.ts line 31 still allows ADMIN and DELIVERY."
    artifacts:
      - path: "services/api-monolith/src/modules/users/auth.controller.ts"
        issue: "Line 31: z.enum(['BUYER', 'SELLER', 'ADMIN', 'DELIVERY']) — ADMIN and DELIVERY are still accepted at registration"
    missing:
      - "Change z.enum(['BUYER', 'SELLER', 'ADMIN', 'DELIVERY']) to z.enum(['BUYER', 'SELLER']) on line 31"

  - truth: "A registration request with role DELIVERY in the body is rejected with 400"
    status: failed
    reason: "Same root cause as ADMIN — registerSchema still allows DELIVERY role at registration"
    artifacts:
      - path: "services/api-monolith/src/modules/users/auth.controller.ts"
        issue: "Line 31: z.enum(['BUYER', 'SELLER', 'ADMIN', 'DELIVERY']) — DELIVERY role is still accepted"
    missing:
      - "Same fix as above — restrict enum to ['BUYER', 'SELLER']"

  - truth: "A request with a valid JWT is accepted regardless of x-user-id/x-user-role headers"
    status: failed
    reason: "While a valid JWT still works (the JWT path exists), the Kong bypass short-circuits before JWT verification when both x-user-id and x-user-role headers are present. This is a secondary consequence of the same revert — the trust boundary is wrong."
    artifacts:
      - path: "services/api-monolith/src/shared/middleware/auth.ts"
        issue: "Kong bypass runs first (lines 20-24) — a request with x-user-id + x-user-role headers never reaches jwt.verify even if it also has a valid JWT"
    missing:
      - "Same fix as truth #1 — remove the Kong bypass block"
---

# Phase 01: Security Hardening Verification Report

**Phase Goal:** Every request is authenticated and authorized through verified tokens, with no information leaking to clients in production.
**Verified:** 2026-04-15T00:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Root Cause: Worktree Merge Revert Incident

Before reviewing individual truths, a systemic issue must be documented:

Commit `a95dd92` (Plan 01-02: CORS restriction) accidentally **reverted two security fixes** from Plan 01-01. The Plan 01-02 executor ran from the original base commit (before Plan 01-01 changes landed on main). When it merged back, its snapshot of `auth.ts` and `auth.controller.ts` were older than what Plan 01-01 had produced. The merge fast-forwarded and overwrote both files.

The `f074e55` chore commit ("restore .planning/ files deleted by executor worktree merge") acknowledged the .planning/ file loss but missed that `services/api-monolith/src/shared/middleware/auth.ts` and `services/api-monolith/src/modules/users/auth.controller.ts` were also reverted to their pre-fix state.

**Evidence:**
- `git show a95dd92 -- services/api-monolith/src/shared/middleware/auth.ts`: shows `+` lines reintroducing the Kong bypass that commit 5601571 had removed
- `git show a95dd92 -- services/api-monolith/src/modules/users/auth.controller.ts`: shows `+  role: z.enum(['BUYER', 'SELLER', 'ADMIN', 'DELIVERY'])` reverting the fix from `bd3e52f`
- Current HEAD state of both files confirms the revert is live

Plans 01-02 and 01-03 are themselves correctly implemented. Only Plan 01-01's two files were clobbered.

---

## Goal Achievement

### Observable Truths (from Plan must_haves + ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A request carrying x-user-id and x-user-role headers but no JWT is rejected with 401 | FAILED | auth.ts lines 17-24 still read these headers; Kong bypass active |
| 2 | A request with a valid JWT is accepted regardless of x-user-id/x-user-role headers | FAILED | Kong bypass fires before JWT check when both headers present |
| 3 | A registration request with role ADMIN in the body is rejected with 400 | FAILED | auth.controller.ts line 31: z.enum includes ADMIN |
| 4 | A registration request with role DELIVERY in the body is rejected with 400 | FAILED | auth.controller.ts line 31: z.enum includes DELIVERY |
| 5 | A registration request with role BUYER succeeds with 201 | VERIFIED | BUYER still in enum; registration path unchanged |
| 6 | A registration request with role SELLER succeeds with 201 | VERIFIED | SELLER still in enum; registration path unchanged |
| 7 | A registration request with no role field succeeds (defaults to BUYER) | VERIFIED | role field is .optional(); no role defaults to BUYER in User model |
| 8 | A cross-origin request from an unknown origin to delivery-service receives no CORS headers | VERIFIED | delivery-service/src/index.ts uses origin function with allowedOrigins; unknown origins return CORS error |
| 9 | A cross-origin request from an unknown origin to notification-service receives no CORS headers | VERIFIED | notification-service/src/index.ts uses identical allowedOrigins pattern |
| 10 | A cross-origin request from WEB_URL to delivery-service receives proper CORS headers | VERIFIED | allowedOrigins includes WEB_URL; origin function allows it |
| 11 | A cross-origin request from WEB_URL to notification-service receives proper CORS headers | VERIFIED | Same pattern in notification-service |
| 12 | A request to delivery /agent/status without a valid JWT is rejected with 401 | VERIFIED | authenticateJWT middleware applied to /api/v1/delivery/agent/status (line 126) |
| 13 | A request to delivery /orders/:orderId/complete without a valid JWT is rejected with 401 | VERIFIED | authenticateJWT middleware applied to /api/v1/delivery/orders/:orderId/complete (line 162) |
| 14 | A request to delivery /:id/assign without a valid JWT is rejected with 401 | VERIFIED | authenticateJWT middleware applied to /api/v1/delivery/:id/assign (line 87) |
| 15 | The delivery /health endpoint remains accessible without auth | VERIFIED | /health route has no authenticateJWT middleware (line 66) |
| 16 | A 500 error in production returns { success: false, error: 'Internal server error' } with no stack trace | VERIFIED | handleError in error.ts checks env.NODE_ENV === 'production'; errorHandler same |
| 17 | A 500 error in development still returns the actual error message for debugging | VERIFIED | handleError returns error.message when NODE_ENV !== 'production' |
| 18 | The full error (message + stack) is logged server-side in all environments | VERIFIED | console.error('[error]', error.message, error.stack) in handleError |
| 19 | 400/401/403/404 responses preserve their existing user-facing messages in all environments | VERIFIED | handleError only sanitizes 500s; ZodError → 400 preserved; 401/403/404 lines untouched in all controllers |
| 20 | Morgan uses 'combined' format in production | VERIFIED | app.ts line 93: morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev') |
| 21 | Morgan uses 'dev' format in development | VERIFIED | Same conditional; 'dev' when not production |

**Score:** 8/13 required truths verified (truths #1-4 failed; roadmap SC #1 and #2 both FAILED)

Note: The ROADMAP success criteria for this phase are:
1. Registration with "role": "ADMIN" rejected with 400 — FAILED
2. Protected route with only x-user-id/x-user-role headers (no JWT) rejected with 401 — FAILED
3. Unknown origin to delivery/notification receives no CORS headers — VERIFIED
4. 500 error in production returns generic message with no internal detail — VERIFIED
5. Protected delivery route without JWT rejected with 401 — VERIFIED

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `services/api-monolith/src/shared/middleware/auth.ts` | JWT-only authenticate middleware | STUB | File exists and has jwt.verify, but Kong bypass block (lines 17-24) was not removed — SEC-02 fix was reverted |
| `services/api-monolith/src/modules/users/auth.controller.ts` | Restricted registerSchema | STUB | File exists but z.enum still includes ADMIN and DELIVERY — SEC-01 fix was reverted |
| `services/delivery-service/src/index.ts` | Restricted CORS + JWT middleware on protected routes | VERIFIED | allowedOrigins, corsOptions, authenticateJWT — all present and correctly wired |
| `services/notification-service/src/index.ts` | Restricted CORS | VERIFIED | allowedOrigins and corsOptions present; CORS is restricted correctly |
| `services/api-monolith/src/shared/middleware/error.ts` | Sanitized errorHandler + handleError helper | VERIFIED | Exports notFound, errorHandler, handleError; production check present |
| `services/api-monolith/src/app.ts` | Environment-conditional Morgan config | VERIFIED | Line 93: morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev') |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `auth.ts` authenticate() | jwt.verify | Authorization Bearer header | PARTIAL | jwt.verify present but Kong bypass fires first — headers bypass JWT entirely |
| `auth.controller.ts` registerSchema | z.enum(['BUYER', 'SELLER']) | Zod parse on request body | FAILED | Enum is z.enum(['BUYER', 'SELLER', 'ADMIN', 'DELIVERY']) — not restricted |
| `delivery-service/index.ts` | process.env.WEB_URL | CORS origin function | VERIFIED | WEB_URL read into allowedOrigins; corsOptions uses origin function |
| `notification-service/index.ts` | process.env.WEB_URL | CORS origin function | VERIFIED | Same pattern as delivery-service |
| `all controllers` → `handleError` | error.ts handleError import | catch block delegation | VERIFIED | 14 controllers all import and call handleError(err, res); zero inline 500 patterns remain |
| `app.ts` → morgan | conditional format | NODE_ENV check | VERIFIED | env.NODE_ENV === 'production' ? 'combined' : 'dev' |

---

## Requirements Coverage

| Requirement | Description | Plan | Status | Evidence |
|-------------|-------------|------|--------|---------|
| SEC-01 | Block ADMIN role self-assignment at registration | 01-01 | FAILED | auth.controller.ts line 31 still allows ADMIN and DELIVERY in z.enum |
| SEC-02 | Remove blind trust of x-user-id/x-user-role headers; require JWT | 01-01 | FAILED | auth.ts lines 17-24 still read Kong headers and bypass JWT verification |
| SEC-03 | Restrict CORS on delivery-service and notification-service to known origin | 01-02 | VERIFIED | Both services use allowedOrigins + origin function; no wildcard CORS |
| SEC-04 | Sanitize error responses in production (no stack traces or DB errors) | 01-03 | VERIFIED | handleError sanitizes 500s in production; all 14 controllers use it |
| SEC-05 | Add JWT verification to protected delivery-service routes | 01-02 | VERIFIED | authenticateJWT applied to 8 routes; /health and /track remain public |
| SEC-06 | Switch Morgan to 'combined' format in production | 01-03 | VERIFIED | app.ts line 93: conditional morgan format based on NODE_ENV |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `services/api-monolith/src/shared/middleware/auth.ts` | 17-24 | Kong header bypass block — reads x-user-id and bypasses JWT | Blocker | SEC-02 vulnerability is live; any client with x-user-id + x-user-role headers can impersonate any user |
| `services/api-monolith/src/modules/users/auth.controller.ts` | 31 | z.enum includes ADMIN and DELIVERY | Blocker | SEC-01 vulnerability is live; any user can self-register as ADMIN |
| `services/notification-service/src/index.ts` | 37-38 | auth() function trusts x-user-id header | Warning | Not in Plan 01-02 scope, but notification-service still has the same Kong bypass pattern in its own auth function; Plan 01-02 only restricted CORS, not the auth function |
| `services/notification-service/src/index.ts` | 52,60,66,79,91,110 | Inline res.status(500).json({ error: err.message }) | Warning | notification-service not in scope of Plan 01-03 (only api-monolith controllers were targeted), but these expose raw error messages in production |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — no live server to test against; all checks are static analysis.

---

## Human Verification Required

None — all critical issues were confirmed programmatically through code inspection and git history analysis. The failures are definitively in the current HEAD codebase.

---

## Gaps Summary

### Two critical SEC-01 and SEC-02 fixes were reverted by the Plan 01-02 executor

The core issue is a worktree merge artifact. Plan 01-01 correctly fixed both files in commits `5601571` and `bd3e52f`. Plan 01-02 ran in a worktree started from the original base commit (before those fixes). When Plan 01-02 merged back, commit `a95dd92` included both `auth.ts` and `auth.controller.ts` at their pre-fix states, overwriting the Plan 01-01 work.

**Current state in HEAD:**
- `auth.ts` authenticate(): Kong bypass is active (lines 17-24)
- `auth.controller.ts` registerSchema: z.enum includes ADMIN and DELIVERY

**Fix required:**
1. Re-apply the Kong bypass removal in `auth.ts` (delete lines 17-24, update comment)
2. Re-apply the enum restriction in `auth.controller.ts` (change z.enum to `['BUYER', 'SELLER']`)

These are the same two single-change fixes from Plan 01-01 and can be re-applied as new commits without re-running Plan 01-01.

### Out-of-scope observations (not blocking Phase 01 completion)

The notification-service auth() function at line 37-38 still trusts `x-user-id` headers. This was not in the scope of Plan 01-02 (which only restricted CORS, not auth in notification-service). This should be tracked as a separate issue.

---

_Verified: 2026-04-15T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
