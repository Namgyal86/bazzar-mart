# Phase 1: Security Hardening - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Close all six security vulnerabilities identified in .planning/codebase/CONCERNS.md. No new features added. Scope covers: auth middleware JWT enforcement, ADMIN role registration block, CORS restriction on delivery/notification services, production error sanitization, JWT verification on delivery routes, and Morgan logger environment config.

Every request must be authenticated through a verified JWT — Kong header pass-through is removed as a bypass. No internal error details leak to production clients.

</domain>

<decisions>
## Implementation Decisions

### Auth Middleware (SEC-02)
- **D-01:** Remove the Kong header shortcut entirely from `authenticate()`. Every request must carry a valid `Authorization: Bearer <JWT>`. `x-user-id`/`x-user-role` headers can no longer bypass JWT verification.
- **D-02:** Kong headers may still be read for supplementary context (e.g., logging) but cannot substitute for JWT verification. If no valid JWT is present, return 401.

### ADMIN Role Block (SEC-01)
- **D-03:** Restrict the registration Zod schema enum to `['BUYER', 'SELLER']` only. Remove `ADMIN` and `DELIVERY` from `registerSchema`. Any value outside this enum fails Zod parse automatically, returning 400 with field-level error detail.
- **D-04:** No separate post-parse guard needed — schema restriction alone satisfies the success criterion. DELIVERY role assignment handled through a separate admin endpoint.

### CORS Config for Internal Services (SEC-03)
- **D-05:** Delivery-service and notification-service both mirror the monolith's CORS logic: allow `env.WEB_URL` + `http://localhost:3000` in development; enforce single origin in production. Read `WEB_URL` and `NODE_ENV` from each service's existing env schema (add if missing).
- **D-06:** Use an origin function (not a string) matching the monolith's pattern at `services/api-monolith/src/app.ts:70-79`.

### Error Sanitization (SEC-04)
- **D-07:** In production (`NODE_ENV === 'production'`), ALL 500 responses return `{ success: false, error: 'Internal server error' }`. 400/401/403/404 responses preserve their existing user-facing messages (Zod validation errors, not-found routes, auth rejections stay visible).
- **D-08:** Create a shared helper `handleError(err, res)` in `services/api-monolith/src/shared/middleware/error.ts`. Replace all inline `res.status(500).json({ success: false, error: (err as Error).message })` patterns across controllers with this helper. The helper logs `err.message + err.stack` server-side regardless of environment.
- **D-09:** The global `errorHandler` middleware also applies the same production sanitization.

### Delivery Service JWT (SEC-05)
- **D-10:** Add JWT verification middleware to ALL delivery agent routes (not just `complete` and `driver-assign`). No reason to leave any agent route unprotected. The JWT secret and `jsonwebtoken` dependency are already in the service.
- **D-11:** Claude's discretion on which exact routes map to which roles (agent vs. admin).

### Morgan Logger (SEC-06)
- **D-12:** Switch to `morgan('combined')` in production; use `morgan('dev')` only when `NODE_ENV === 'development'`. Single conditional in `app.ts` where Morgan is registered.

### Claude's Discretion
- Delivery service JWT middleware implementation details (reuse `jsonwebtoken` import already in the file)
- Exact env schema additions for WEB_URL in delivery/notification services
- Whether to extract the CORS origin function into a shared utility or copy inline

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Security vulnerabilities (source of truth)
- `.planning/codebase/CONCERNS.md` §Security Considerations — Full vulnerability descriptions with exact file paths and line numbers for all 6 SEC requirements

### Files to modify
- `services/api-monolith/src/shared/middleware/auth.ts` — Current authenticate() implementation (lines 17-24 are the Kong header shortcut to remove)
- `services/api-monolith/src/shared/middleware/error.ts` — Current errorHandler (line 9 exposes err.message verbatim)
- `services/api-monolith/src/modules/users/auth.controller.ts` — registerSchema (line 28, role enum to restrict)
- `services/api-monolith/src/app.ts` — Morgan config (line 93), CORS config reference (lines 65-92)
- `services/delivery-service/src/index.ts` — Wildcard CORS (line 19), unprotected routes (lines 93-148)
- `services/notification-service/src/index.ts` — Wildcard CORS (line 15)

### Success criteria (from ROADMAP.md)
- Registration with `role: 'ADMIN'` → 400
- Request with only x-user-id/x-user-role headers (no JWT) → 401
- Cross-origin from unknown origin to delivery/notification → no CORS headers
- 500 error in production → generic message, no stack trace
- Request to delivery `complete`/`driver-assign` without JWT → 401

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `services/api-monolith/src/shared/middleware/auth.ts` — `requireRole()`, `optionalAuth()` already correct; only `authenticate()` needs the Kong header shortcut removed
- `services/api-monolith/src/app.ts` — CORS origin function (lines 70-79) is the template for delivery/notification services
- `jsonwebtoken` import already present in `services/delivery-service/src/index.ts` (line 155 area) — JWT verify already happens for Socket.io; the same pattern can be reused for HTTP routes

### Established Patterns
- Controller error handling: `try { ... } catch (err) { if (err.name === 'ZodError') { res.status(400)... } res.status(500).json({ success: false, error: (err as Error).message }) }` — this pattern repeats across all controllers; the `handleError` helper replaces the 500 branch
- Env validation: `src/config/env.ts` uses Zod and `process.exit(1)` for missing required vars — same pattern to add `WEB_URL` to delivery/notification env schemas
- Response shape: always `{ success: boolean, data?: T, error?: string }` — keep consistent

### Integration Points
- JWT secret: `env.JWT_ACCESS_SECRET` in monolith's `config/env.ts`; delivery service has its own `SECRET` constant (line ~10) — use the shared secret from env
- CORS in monolith reads `env.WEB_URL` — delivery/notification services need to read the same var; add it to their env validation if missing

</code_context>

<specifics>
## Specific Ideas

No specific preferences expressed — open to standard implementation approaches matching existing conventions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-security-hardening*
*Context gathered: 2026-04-14*
