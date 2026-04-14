# Phase 1: Security Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-14
**Phase:** 01-security-hardening
**Mode:** discuss
**Areas discussed:** Auth header trust model, ADMIN role blocking, Internal service CORS, Error sanitization boundary

## Gray Areas Identified

| Area | Requirement | Gray area description |
|------|-------------|----------------------|
| Auth header trust | SEC-02 | When Kong headers arrive with no JWT, how does authenticate() respond? |
| ADMIN role block | SEC-01 | Schema restriction vs. explicit post-parse guard |
| Internal service CORS | SEC-03 | Monolith-mirror vs. simpler env var approach |
| Error sanitization | SEC-04 | All-500s-generic vs. global handler only vs. AppError class |
| Delivery JWT scope | SEC-05 | Not discussed — Claude decision: protect all agent routes |
| Morgan format | SEC-06 | Not discussed — straightforward: combined in prod, dev in dev |

## Decisions Made

### Auth header trust model (SEC-02)
- **Question:** When x-user-id/x-user-role headers arrive with no JWT, what should authenticate() do?
- **User chose:** Always require JWT (Recommended)
- **Decision:** Remove the Kong header shortcut entirely. Every request must carry a valid Bearer JWT. Headers can no longer bypass JWT verification.

### ADMIN role blocking (SEC-01)
- **Question:** How should the registration endpoint handle role: 'ADMIN' in the body?
- **User chose:** Restrict schema to BUYER | SELLER only (Recommended)
- **Decision:** Remove ADMIN and DELIVERY from the public registration enum. Zod validation automatically returns 400 for any other value.

### Internal service CORS (SEC-03)
- **Question:** How should delivery and notification services restrict CORS origin?
- **User chose:** Mirror monolith: WEB_URL env var + localhost:3000 in dev (Recommended)
- **Decision:** Both services add WEB_URL + NODE_ENV env vars and apply the same origin-function logic as the monolith.

### Error sanitization boundary (SEC-04)
- **Question:** Which errors should be hidden in production?
- **User chose:** All 500s get generic message (Recommended)
- **Decision:** Fix global errorHandler + create handleError() helper used in all controller catch blocks. Only 500 status is sanitized; 4xx errors remain visible.

## Auto-decided (not discussed)
- **SEC-05 Delivery JWT scope:** All agent routes protected (not just complete/driver-assign) — more secure, simpler to reason about
- **SEC-06 Morgan format:** `combined` in production, `dev` in development — straightforward implementation

## Corrections
None — all recommended options accepted.
