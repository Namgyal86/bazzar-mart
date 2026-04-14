---
phase: 01-security-hardening
plan: 02
subsystem: api
tags: [cors, jwt, delivery-service, notification-service, security]

# Dependency graph
requires: []
provides:
  - Origin-restricted CORS on delivery-service (WEB_URL + localhost:3000)
  - Origin-restricted CORS on notification-service (WEB_URL + localhost:3000)
  - JWT authentication middleware on all delivery agent and admin routes
affects: [testing, delivery-service, notification-service]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Origin function CORS pattern (mirrors monolith) applied to microservices
    - authenticateJWT middleware reading Bearer token, setting req.user from JWT payload

key-files:
  created: []
  modified:
    - services/delivery-service/src/index.ts
    - services/notification-service/src/index.ts

key-decisions:
  - "Auth-only (no role check) on delivery routes — delivery-service has no role infrastructure"
  - "Socket.io CORS restricted to allowedOrigins array (not wildcard)"
  - "Agent route handlers switched from x-user-id header to JWT payload userId"

patterns-established:
  - "CORS pattern: allowedOrigins = [WEB_URL, localhost:3000], origin function, development bypass"
  - "JWT middleware: Bearer header required, jwt.verify with SECRET, sets req.user"

requirements-completed: [SEC-03, SEC-05]

# Metrics
duration: 18min
completed: 2026-04-14
---

# Phase 01 Plan 02: CORS Restriction and JWT Auth on Delivery and Notification Services Summary

**Wildcard CORS replaced with origin-restricted config on delivery-service and notification-service; all delivery admin and agent HTTP routes now require a valid JWT Bearer token**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-14T00:00:00Z
- **Completed:** 2026-04-14T00:18:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced `origin: '*'` with WEB_URL-restricted origin function in delivery-service (HTTP and Socket.io)
- Replaced `origin: '*'` with WEB_URL-restricted origin function in notification-service
- Added `authenticateJWT` middleware to delivery-service protecting 8 routes
- /health and /track/:orderId remain unprotected (k8s probes and public buyer tracking)
- Agent route handlers no longer trust x-user-id header — userId now sourced from JWT payload

## Task Commits

Each task was committed atomically:

1. **Task 1: Restrict CORS on delivery-service and notification-service** - `a95dd92` (fix)
2. **Task 2: Add JWT verification middleware to all delivery agent routes** - `85cf3b3` (fix)

## Files Created/Modified
- `services/delivery-service/src/index.ts` - Origin-restricted CORS + Socket.io CORS + authenticateJWT middleware on 8 routes
- `services/notification-service/src/index.ts` - Origin-restricted CORS (auth already existed)

## Decisions Made
- Auth-only on delivery routes (no role check): delivery-service has no role infrastructure; JWT presence is sufficient for the security goal
- Socket.io CORS restricted to `allowedOrigins` array rather than origin function (socket.io handles array natively)
- Agent route handlers (`agent/status`, `agent/orders`) switched from `req.headers['x-user-id']` to `(req as any).user?.userId` from the JWT payload — x-user-id was an untrusted header

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Two pre-existing TypeScript errors in delivery-service (missing `socket.io` type declarations, implicit `any` on socket parameter) were present before this plan and are out of scope. They do not affect runtime behavior or the changes made in this plan.

## User Setup Required

None — no external service configuration required. `WEB_URL` is read from `process.env.WEB_URL` with fallback to `http://localhost:3000`.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. This plan closes existing threat surface (T-01-04 through T-01-08 in plan threat register).

## Next Phase Readiness
- delivery-service and notification-service CORS hardened — ready for Plan 03
- JWT auth covers all delivery agent and admin routes
- Pre-existing TypeScript type errors in delivery-service should be addressed in a future plan (missing `@types/socket.io` or equivalent)

---
*Phase: 01-security-hardening*
*Completed: 2026-04-14*
