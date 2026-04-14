# Coding Conventions

**Analysis Date:** 2026-04-14

## Naming Patterns

**Files (Backend — `services/api-monolith/src/`):**
- Controllers: `<noun>.controller.ts` — e.g., `auth.controller.ts`, `product.controller.ts`
- Routes: `<noun>.routes.ts` — e.g., `user.routes.ts`, `order.routes.ts`
- Models: `<noun>.model.ts` — e.g., `user.model.ts`, `payment.model.ts`
- Services: `<noun>.service.ts` — e.g., `cart.service.ts`, `khalti.service.ts`
- Config: `<concern>.ts` inside `src/config/` — e.g., `env.ts`, `db.ts`, `redis.ts`
- Shared middleware: flat files in `src/shared/middleware/` — e.g., `auth.ts`, `error.ts`

**Files (Frontend — `web/src/`):**
- Components: `kebab-case.tsx` — e.g., `hero-section.tsx`, `cart-drawer.tsx`
- Hooks: `use-<name>.ts` — e.g., `use-toast.ts`, `use-scroll-reveal.ts`
- Stores: `<noun>.store.ts` — e.g., `auth.store.ts`, `cart.store.ts`
- API clients: `<noun>.api.ts` inside `src/lib/api/` — e.g., `product.api.ts`, `cart.api.ts`

**Exported Symbols:**
- React components: PascalCase — `HeroSection`, `CartDrawer`, `Button`
- Hooks: camelCase with `use` prefix — `useCartStore`, `useAuthStore`, `useToast`
- Express controller handlers: camelCase verbs — `register`, `login`, `getProducts`, `createOrder`
- TypeScript interfaces: PascalCase with `I` prefix on Mongoose documents — `IUser`, used in backend; plain names on frontend — `CartItem`, `AuthUser`, `Product`
- Event payload interfaces: `<EventName>Payload` — `PaymentSuccessPayload`, `OrderCreatedPayload`
- Zod schemas: camelCase with `Schema` suffix — `registerSchema`, `createProductSchema`
- Constants/enum-like objects: `SCREAMING_SNAKE_CASE` — `EVENTS.ORDER_CREATED`, `ORDER_STATUS_LABELS`

**Directories:**
- Backend modules: plural noun — `users`, `products`, `orders`, `payments`
- Frontend route groups: Next.js convention — `(buyer)`, `(admin)` wrapped in parentheses
- Frontend feature component folders: lowercase — `home/`, `cart/`, `layout/`, `ui/`

## Code Style

**Formatting:**
- Tool: Prettier (root-level, `prettier --write "**/*.{ts,tsx,json}"`)
- No explicit `.prettierrc` detected — uses project defaults (2-space indent, single quotes implied from codebase)
- TypeScript `strict: true` across all packages via `tsconfig.base.json`
- `noImplicitAny: true`, `strictNullChecks: true` enforced

**Linting:**
- Tool: ESLint with `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser`
- Config at root — `eslint . --ext .ts,.tsx`
- `noUnusedLocals: false`, `noUnusedParameters: false` (not enforced at TS level)
- `next.config.js` sets `typescript.ignoreBuildErrors: true` — build does NOT fail on TS errors

**Alignment Style:**
- Object properties are column-aligned using extra spaces for readability:
  ```typescript
  const user = await User.create({
    firstName:  body.firstName,
    lastName:   body.lastName,
    email:      body.email,
  });
  ```
- Route definitions are column-aligned:
  ```typescript
  router.post('/auth/register', authLimiter, register);
  router.post('/auth/login',    authLimiter, login);
  ```

## Import Organization

**Backend (`services/`):**
Order:
1. Node built-ins (`path`, `fs`, `events`)
2. Third-party (`express`, `mongoose`, `zod`, `jsonwebtoken`, `bcryptjs`)
3. Internal config (`../../config/env`, `../../config/redis`)
4. Internal shared (`../../shared/middleware/auth`, `../../shared/events/emitter`)
5. Module-local (`./models/user.model`, `./utils/jwt`)

**Frontend (`web/src/`):**
Order:
1. React and Next.js (`react`, `next/image`, `next/link`, `next/font`)
2. Third-party UI (`lucide-react`, `framer-motion`, `@tanstack/react-query`)
3. Internal stores (`@/store/auth.store`, `@/store/cart.store`)
4. Internal lib/api (`@/lib/api/client`, `@/lib/utils`)
5. Internal components (`@/components/layout/header`)

**Path Aliases:**
- `@/` maps to `web/src/` — used consistently across all frontend files

## Error Handling

**Backend — Controller Pattern:**
All controller handlers use `try/catch` wrapping the entire function body. Return type is always `Promise<void>`. Early-return on error responses to prevent double-send:

```typescript
export const handler = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = schema.parse(req.body);  // Zod validation first
    // ...business logic...
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ZodError') {
      res.status(400).json({ success: false, error: (err as { errors: unknown }).errors });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};
```

**Response Shape — always `{ success: boolean, data: T | null, error?: string }`:**
- Success: `{ success: true, data: <payload> }`
- Failure: `{ success: false, error: '<message>' }`
- Paginated: `{ success: true, data: [...], meta: { total, page, limit, pages } }`

**Backend — Fire-and-forget async calls:**
Non-critical async side effects (Kafka publish, referral award) use `.catch(() => {})` to swallow errors silently:
```typescript
publishEvent('user.registered', payload).catch(() => {});
```

**Backend — Internal event handlers:**
All `internalBus.on()` handlers must wrap their body in `try/catch` and log errors with `console.error`:
```typescript
internalBus.on(EVENTS.REVIEW_POSTED, async (p) => {
  try { /* logic */ } catch (err) { console.error('[reviews] handler error:', err); }
});
```

**Frontend — API call pattern:**
In React components, API calls use `.then().catch(() => {})` for fire-and-forget syncs, and `try/catch` inside async handlers:
```typescript
cartApi.removeItem(productId).catch(() => {}); // silent background sync

const handleSubmit = async () => {
  try {
    await apiClient.post(url, data);
  } catch (err) {
    toast({ title: getErrorMessage(err), variant: 'destructive' });
  }
};
```

**Frontend — Error extraction:**
Use `getErrorMessage(error)` from `src/lib/api/client.ts` to extract user-facing strings from Axios errors.

## Environment Configuration

**Backend:**
- Environment validated at startup using Zod in `src/config/env.ts`
- Missing required vars cause `process.exit(1)` immediately
- All env access goes through `import { env } from '../../config/env'` — never `process.env` directly in business logic

**Frontend:**
- `NEXT_PUBLIC_*` vars for client-accessible config
- `apiClient` base URL: `process.env.NEXT_PUBLIC_API_BASE_URL || ''` — empty string means Next.js rewrites proxy

## Logging

**Framework:** `console.error` / `console.warn` / `console.log` — no structured logging library

**Patterns:**
- HTTP request logging via `morgan('dev')` middleware
- Error handler logs: `console.error('[error]', err.message, err.stack)`
- Module event handler errors: `console.error('[<module>] <event> handler error:', err)`
- Startup degraded states: `console.warn('⚠️  <service> unavailable — <degraded behavior>:', err.message)`
- Startup success: `console.log` with emoji decorators (e.g., `🚀`, `❌`)

## Comments

**When to Comment:**
- File-level JSDoc block explaining purpose, notable design decisions, and what the file replaces or relates to — required for controllers and app entry points
- Section dividers using `// ── Section Name ─────────────────` pattern throughout files
- Inline comments for non-obvious behavior (e.g., `// Keep only last 5 refresh tokens`)

**JSDoc/TSDoc:**
- File-level `/** ... */` blocks on controllers and key shared files
- No per-function JSDoc — function names are self-documenting
- Interface/type fields use optional `//` inline comments for clarification when needed

## Function Design

**Size:** Controllers are large single-file modules; individual handler functions are 20–50 lines
**Parameters:** Express handlers always `(req, res)` or `(req, res, next)` — no dependency injection
**Return Values:** All async controller handlers return `Promise<void>`; service functions return the computed data directly

## Module Design

**Backend Exports:**
- Controller functions: named exports — `export const register = async ...`
- Event handler registrars: named `registerXxxEventHandlers()` function
- Models: named export of the Mongoose model — `export const User = ...`
- Config: named export of validated env object — `export const env = ...`
- Routes: single default export — `export default router`

**Frontend Exports:**
- Zustand stores: named export of the hook — `export const useCartStore = create<...>(...)`
- API client objects: named export — `export const categoryApi = { ... }`
- React components: named exports — `export function CartDrawer() {}`
- UI primitives: named exports with display name — `Button.displayName = 'Button'`

**Barrel Files:**
- Sparse usage: `src/modules/cart/index.ts`, `src/modules/referrals/index.ts` for select modules
- Not used across all modules — imports reference specific files directly

## Validation

**Backend:** Zod schemas declared at the top of each controller file with a `// ── Validation ──` section header. `schema.parse(req.body)` is called as the first operation inside handlers.

**Frontend:** No form validation library detected — validation logic is implicit in API responses.

---

*Convention analysis: 2026-04-14*
