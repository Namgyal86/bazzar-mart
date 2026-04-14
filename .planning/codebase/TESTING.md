# Testing Patterns

**Analysis Date:** 2026-04-14

## Test Framework

**Runner:** None installed

No test framework is configured anywhere in this codebase. Neither Jest, Vitest, Mocha, nor any other test runner appears in any `package.json` across the monorepo:

- `D:/E-commerce/bazzar-mart/package.json` — no test dependencies
- `D:/E-commerce/bazzar-mart/services/api-monolith/package.json` — no test dependencies
- `D:/E-commerce/bazzar-mart/web/package.json` — not examined but no test config files found

**Assertion Library:** None

**Run Commands:**
```bash
# No test commands exist in any package
# npm test would fail with "missing script: test"
```

## Test File Organization

**Location:** No test files exist anywhere in the codebase.

A search across all workspace directories (`services/`, `web/`, `packages/`, `mobile/`) found zero files matching `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`.

The root `tsconfig.base.json` does exclude test files from compilation:
```json
"exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
```
This exclusion was pre-written in anticipation of future tests — no actual test files back it up.

**Naming:** No convention established — none to document.

**Structure:** No test directories (`__tests__/`, `tests/`, `test/`) exist in any workspace.

## Test Structure

**No established pattern.** When tests are introduced, the following should be used as a baseline given the codebase's architecture:

**Recommended suite pattern for Express controllers:**
```typescript
describe('AuthController', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should return 201 with tokens on valid registration', async () => { });
    it('should return 409 when email already registered', async () => { });
    it('should return 400 on Zod validation failure', async () => { });
  });
});
```

**Recommended suite pattern for service functions (e.g., `cart.service.ts`):**
```typescript
describe('CartService', () => {
  describe('addItem', () => {
    it('should add a new item to an empty cart', async () => { });
    it('should increment quantity when item already exists', async () => { });
    it('should cap quantity at stock limit', async () => { });
  });
});
```

## Mocking

**Framework:** None — no mocking library installed.

**What would need to be mocked when tests are added:**

- **MongoDB / Mongoose** — `mongoose.Model.find`, `findOne`, `create`, `findByIdAndUpdate`
  - Recommended: `jest-mock-extended` or `mongodb-memory-server` for integration tests
- **Redis (`ioredis`)** — `getRedis().get`, `.setex`, `.del`
  - Recommended: `ioredis-mock`
- **KafkaJS producer** — `publishEvent` function in `src/kafka/producer.ts`
  - Recommended: mock the module with `jest.mock('../../kafka/producer')`
- **Axios** — `axios.post` in payment services (`khalti.service.ts`, `esewa.service.ts`)
  - Recommended: `jest.spyOn(axios, 'post')`
- **JWT** — `jsonwebtoken.sign`, `jsonwebtoken.verify`
  - Recommended: mock or use real tokens with a test secret

**What NOT to mock:**
- Zod schemas — test with real parse calls, passing/failing payloads
- `internalBus` emitter — test actual handler registration in integration tests
- Business logic helper functions — unit test these directly

## Fixtures and Factories

**Test Data:** No fixture files or factory helpers exist.

**Recommended location when introduced:**
```
services/api-monolith/src/__tests__/fixtures/
  user.fixture.ts     # IUser-shaped test data
  product.fixture.ts  # Product-shaped test data
  order.fixture.ts    # Order-shaped test data
```

**Recommended factory pattern** matching the `IUser` interface in `src/modules/users/models/user.model.ts`:
```typescript
export function makeUser(overrides: Partial<IUser> = {}): Partial<IUser> {
  return {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: 'BUYER',
    isActive: true,
    isEmailVerified: false,
    referralCode: 'TEST1234',
    refreshTokens: [],
    wishlist: [],
    ...overrides,
  };
}
```

## Coverage

**Requirements:** None enforced — no coverage tool configured.

**View Coverage:**
```bash
# No coverage command available — needs test framework first
```

**Coverage gaps (all code is uncovered):**
- `services/api-monolith/src/modules/users/auth.controller.ts` — register, login, refresh, logout
- `services/api-monolith/src/modules/cart/cart.service.ts` — all Redis-backed cart operations
- `services/api-monolith/src/modules/payments/services/khalti.service.ts` — payment initiation/lookup
- `services/api-monolith/src/modules/payments/services/esewa.service.ts` — payment verification
- `services/api-monolith/src/shared/middleware/auth.ts` — authenticate, requireRole, optionalAuth
- `services/api-monolith/src/config/env.ts` — Zod env validation on startup
- All internalBus event handlers registered in `registerXxxEventHandlers()` functions

## Test Types

**Unit Tests:** Not present. Highest value targets when introduced:
- `src/modules/cart/cart.service.ts` — pure logic functions with Redis dependency
- `src/lib/utils.ts` (frontend) — `formatCurrency`, `formatDate`, `slugify`, `buildQueryString`
- `src/modules/users/utils/jwt.ts` — token sign/verify helpers
- Payment service functions in `src/modules/payments/services/`

**Integration Tests:** Not present. High-value targets:
- Full request/response cycle for auth routes using `supertest` against `createApp()`
- Cart operations using `ioredis-mock`
- Order creation flow involving multiple modules and `internalBus` events

**E2E Tests:** Not present. No Playwright or Cypress config found.

## Adding Tests — Recommended Setup

Given the stack (Express + TypeScript + Mongoose), the recommended setup when introducing tests:

```bash
# In services/api-monolith
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest mongodb-memory-server ioredis-mock
```

**Minimal `jest.config.ts`:**
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^ioredis$': '<rootDir>/src/__mocks__/ioredis.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/server.ts'],
};

export default config;
```

**`package.json` scripts to add:**
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

## Manual Testing Approach (Current Practice)

In the absence of automated tests, the codebase is tested via:
- **Health endpoints** — `/health`, `/health/db`, `/health/full` on the monolith
- **Seed scripts** — `seed.js`, `seed-grocery.js`, `seed-all-dbs.js` at repository root populate test data
- **Direct API calls** — `curl` / Postman against `localhost:8100`
- **Next.js dev server** — browser-based manual verification of frontend

---

*Testing analysis: 2026-04-14*
