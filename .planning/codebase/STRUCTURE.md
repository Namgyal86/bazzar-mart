# Codebase Structure

**Analysis Date:** 2026-04-14

## Directory Layout

```
bazzar-mart/                        # npm workspace root
├── package.json                    # Workspace root — defines workspaces: packages/*, services/*, web
├── tsconfig.base.json              # Shared TS base config extended by all packages
├── docker-compose.yml              # Full stack: infra + api-monolith + delivery + notification + web
├── seed.js / seed-all-dbs.js / seed-grocery.js  # Database seed scripts
├── start-services.sh / .bat        # Dev convenience scripts
│
├── packages/
│   └── shared/                     # Shared TypeScript library (@bazzar/shared)
│       └── src/
│           ├── index.ts            # Barrel export
│           ├── kafka/              # consumer.ts, producer.ts
│           ├── middleware/         # auth.ts, errorHandler.ts, validate.ts
│           ├── redis/              # index.ts
│           ├── logger/             # index.ts
│           ├── errors/             # index.ts
│           └── types/              # index.ts
│
├── services/
│   ├── api-monolith/               # Core backend — Express, port 8100
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app.ts              # Express app factory (all routes registered here)
│   │       ├── server.ts           # Bootstrap: DB connect, Kafka, event handlers, listen
│   │       ├── config/
│   │       │   ├── env.ts          # Zod-validated env schema
│   │       │   ├── db.ts           # Mongoose connect helper
│   │       │   └── redis.ts        # Redis client singleton
│   │       ├── kafka/
│   │       │   ├── producer.ts     # Single shared Kafka producer (publishEvent)
│   │       │   └── consumers/
│   │       │       └── index.ts    # Kafka consumer registrations (delivery events)
│   │       ├── shared/
│   │       │   ├── middleware/
│   │       │   │   ├── auth.ts     # authenticate, optionalAuth, requireRole
│   │       │   │   └── error.ts    # notFound, errorHandler
│   │       │   └── events/
│   │       │       └── emitter.ts  # internalBus typed EventEmitter + EVENTS constants
│   │       └── modules/            # Domain modules — one folder per business domain
│   │           ├── analytics/      # analytics.controller.ts, .model.ts, .routes.ts
│   │           ├── cart/           # cart.controller.ts, .service.ts, .routes.ts, index.ts
│   │           ├── orders/
│   │           │   ├── models/     # order.model.ts, coupon.model.ts
│   │           │   ├── order.controller.ts
│   │           │   └── order.routes.ts
│   │           ├── payments/
│   │           │   ├── models/     # payment.model.ts
│   │           │   ├── services/   # khalti.service.ts, esewa.service.ts
│   │           │   ├── payment.controller.ts
│   │           │   ├── payment.routes.ts
│   │           │   └── index.ts
│   │           ├── products/
│   │           │   ├── models/     # product.model.ts, category.model.ts, banner.model.ts
│   │           │   ├── product.controller.ts
│   │           │   └── product.routes.ts
│   │           ├── recommendations/
│   │           ├── referrals/
│   │           │   ├── models/     # referral.model.ts
│   │           │   ├── referral.controller.ts
│   │           │   ├── referral.routes.ts
│   │           │   └── index.ts
│   │           ├── reviews/
│   │           ├── search/         # search.controller.ts, search.routes.ts (no separate model)
│   │           ├── sellers/
│   │           │   ├── models/     # seller.model.ts
│   │           │   └── ...
│   │           ├── storefront/
│   │           ├── support/
│   │           ├── upload/
│   │           └── users/
│   │               ├── models/     # user.model.ts
│   │               ├── utils/
│   │               ├── auth.controller.ts
│   │               ├── user.controller.ts
│   │               └── user.routes.ts
│   │
│   ├── delivery-service/           # Real-time delivery — Express + Socket.io, port 8013
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── index.ts            # All-in-one: REST routes, Socket.io, boot
│   │       └── kafka/
│   │           ├── consumers/index.ts
│   │           └── producer.ts
│   │
│   └── notification-service/       # Push/SMS/email notifications — Express, port 8008
│       ├── Dockerfile
│       └── src/
│           ├── index.ts            # All-in-one: REST routes, boot
│           ├── models/
│           │   └── notification.model.ts
│           └── kafka/
│               └── consumers/index.ts
│
├── web/                            # Next.js 14 App Router frontend, port 3000
│   ├── Dockerfile
│   ├── next.config.js              # API rewrites (proxy to backend services)
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── app/                    # Next.js App Router
│       │   ├── layout.tsx          # Root layout (Providers, Toaster)
│       │   ├── (buyer)/            # Route group — buyer storefront (has shared Header/Footer)
│       │   │   ├── layout.tsx      # BuyerLayout: Header + Footer + CartDrawer
│       │   │   ├── page.tsx        # Homepage /
│       │   │   ├── products/       # /products, /products/[id]
│       │   │   ├── categories/     # /categories/[slug]
│       │   │   ├── cart/           # /cart
│       │   │   ├── checkout/       # /checkout
│       │   │   ├── payment/        # /payment/verify, /payment/failed
│       │   │   ├── search/         # /search
│       │   │   ├── deals/          # /deals
│       │   │   ├── store/          # /store/[slug]
│       │   │   ├── wishlist/       # /wishlist
│       │   │   ├── contact/        # /contact, /contact/admin
│       │   │   └── account/        # /account/profile, /orders, /addresses, /referral, /track/[orderId]
│       │   ├── seller/             # Seller dashboard (glassmorphic sidebar layout)
│       │   │   ├── layout.tsx      # SellerLayout: auth-guarded, sidebar nav
│       │   │   ├── dashboard/
│       │   │   ├── products/       # /products, /products/new, /products/[id]/edit
│       │   │   ├── orders/
│       │   │   ├── analytics/
│       │   │   ├── customers/
│       │   │   ├── reviews/
│       │   │   ├── inventory/
│       │   │   ├── payouts/
│       │   │   ├── storefront/
│       │   │   ├── notifications/
│       │   │   └── settings/
│       │   ├── admin/              # Admin console (dark glassmorphic sidebar layout)
│       │   │   ├── layout.tsx      # AdminLayout: role-guarded (ADMIN only), sidebar
│       │   │   ├── dashboard/
│       │   │   ├── analytics/
│       │   │   ├── users/
│       │   │   ├── sellers/
│       │   │   ├── products/
│       │   │   ├── categories/
│       │   │   ├── orders/
│       │   │   ├── payments/
│       │   │   ├── delivery/
│       │   │   ├── flash-deals/
│       │   │   ├── coupons/
│       │   │   ├── reviews/
│       │   │   ├── referrals/
│       │   │   ├── banners/
│       │   │   ├── support/
│       │   │   ├── notifications/
│       │   │   └── settings/
│       │   ├── auth/               # /auth/login, /auth/register, /auth/forgot-password
│       │   ├── sellers/            # /sellers/register (public seller signup)
│       │   └── api/                # Next.js API routes (BFF thin layer)
│       │       ├── upload/route.ts
│       │       └── v1/
│       │           ├── analytics/  # /admin/overview, /platform-health
│       │           ├── notifications/admin/route.ts
│       │           └── support/    # contact, messages, admin-contact, admin-messages
│       ├── components/
│       │   ├── ui/                 # Primitive UI components (Button, Card, Input, Badge, Toaster, ImageUpload)
│       │   ├── layout/             # header.tsx, footer.tsx
│       │   ├── cart/               # cart-drawer.tsx
│       │   ├── home/               # hero-section.tsx, category-grid.tsx, featured-products.tsx, etc.
│       │   ├── providers.tsx       # Root React Query + Zustand provider wrapper
│       │   └── providers/
│       │       └── admin-theme-provider.tsx
│       ├── lib/
│       │   ├── api/
│       │   │   ├── client.ts       # Axios singleton with JWT interceptors + auto-refresh
│       │   │   ├── auth.api.ts
│       │   │   ├── cart.api.ts
│       │   │   ├── order.api.ts
│       │   │   ├── product.api.ts
│       │   │   ├── seller.api.ts
│       │   │   ├── user.api.ts
│       │   │   ├── payment.api.ts
│       │   │   ├── review.api.ts
│       │   │   ├── search.api.ts
│       │   │   ├── referral.api.ts
│       │   │   └── notification.api.ts
│       │   └── utils.ts            # cn() Tailwind class merge utility
│       ├── store/
│       │   ├── auth.store.ts       # Zustand: user, accessToken, refreshToken (persisted)
│       │   ├── cart.store.ts       # Zustand: cart items synced with API
│       │   ├── wishlist.store.ts   # Zustand: wishlist (local)
│       │   └── theme.store.ts      # Zustand: admin theme / branding (logo, siteName)
│       └── hooks/
│           ├── use-scroll-reveal.ts
│           └── use-toast.ts
│
├── mobile/
│   ├── buyer_app/                  # Flutter buyer app
│   │   └── lib/
│   │       ├── main.dart
│   │       ├── core/
│   │       │   ├── network/api_client.dart
│   │       │   ├── providers/auth_provider.dart
│   │       │   ├── router/app_router.dart
│   │       │   └── theme/app_theme.dart
│   │       └── features/           # auth, cart, checkout, home, main, orders, products, profile, referral, search, wishlist
│   │           └── {feature}/
│   │               └── presentation/{feature}_screen.dart
│   ├── admin_app/                  # Flutter admin app
│   │   └── lib/
│   │       ├── main.dart
│   │       ├── core/               # network, providers, router
│   │       └── features/           # auth, dashboard, main, orders, sellers, settings, users
│   └── delivery_app/               # Flutter delivery agent app
│       └── lib/
│           ├── main.dart
│           ├── core/               # network, providers, router
│           └── features/           # auth, delivery, history, home
│
├── infrastructure/
│   ├── github-actions/             # deploy.yml, pr-checks.yml
│   ├── k8s/                        # Kubernetes manifests
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── ingress.yaml
│   │   └── services/               # api-monolith.yaml, delivery-service.yaml, notification-service.yaml
│   ├── kong/                       # kong.yml — API gateway config
│   └── terraform/                  # main.tf — cloud infra provisioning
│
└── docs/                           # Additional documentation
```

## Directory Purposes

**`services/api-monolith/src/modules/`:**
- Purpose: All core business domains, each self-contained
- Contains: One subdirectory per domain; each has `{name}.routes.ts`, `{name}.controller.ts`, optionally `{name}.service.ts`, and `models/` subdirectory
- Key files: `cart/cart.service.ts` (Redis logic), `orders/order.controller.ts` (business rules + event handlers), `payments/services/khalti.service.ts` (payment gateway)

**`services/api-monolith/src/shared/`:**
- Purpose: Cross-cutting concerns shared across all modules within the monolith
- Contains: `middleware/auth.ts` (JWT + Kong header auth), `middleware/error.ts` (404 + 500 handlers), `events/emitter.ts` (typed in-process bus)

**`web/src/app/(buyer)/`:**
- Purpose: All customer-facing buyer pages; wrapped in `BuyerLayout` (Header + Footer + CartDrawer)
- Route group parentheses `(buyer)` means the folder name does NOT appear in the URL

**`web/src/app/admin/` and `web/src/app/seller/`:**
- Purpose: Role-specific dashboards; each has its own `layout.tsx` that guards access via `useAuthStore` role check and redirects to `/auth/login` if not authenticated

**`web/src/lib/api/`:**
- Purpose: Per-domain typed API functions; all import `apiClient` from `client.ts`
- Pattern: Each `{domain}.api.ts` file exports async functions that call `apiClient.get/post/put/patch/delete`

**`web/src/store/`:**
- Purpose: Global client state via Zustand
- `auth.store.ts` is persisted to localStorage; `cart.store.ts` syncs with backend; others are in-memory

**`packages/shared/src/`:**
- Purpose: Shared utilities for `delivery-service` and `notification-service` (NOT used by api-monolith which has its own copies)
- Key files: `kafka/consumer.ts`, `kafka/producer.ts`, `middleware/auth.ts`, `redis/index.ts`

## Key File Locations

**Entry Points:**
- `services/api-monolith/src/app.ts`: Express app factory — all module routes registered here
- `services/api-monolith/src/server.ts`: Bootstrap — DB, Redis, Kafka, event handler registration, HTTP listen
- `services/delivery-service/src/index.ts`: All-in-one delivery service boot
- `services/notification-service/src/index.ts`: All-in-one notification service boot
- `web/src/app/layout.tsx`: Next.js root layout
- `web/next.config.js`: API proxy rewrites — critical routing configuration

**Configuration:**
- `services/api-monolith/src/config/env.ts`: Zod-validated environment schema (fail-fast on bad env)
- `services/api-monolith/src/config/db.ts`: Mongoose connection helper
- `services/api-monolith/src/config/redis.ts`: Redis client singleton
- `docker-compose.yml`: Full local dev stack definition
- `tsconfig.base.json`: Shared TypeScript config extended by all packages

**Core Logic:**
- `services/api-monolith/src/shared/events/emitter.ts`: Typed in-process event bus (internalBus)
- `services/api-monolith/src/kafka/producer.ts`: Shared Kafka producer (`publishEvent`)
- `services/api-monolith/src/shared/middleware/auth.ts`: Auth middleware used by all protected routes
- `web/src/lib/api/client.ts`: Axios singleton with JWT attach + auto-refresh

**Testing:**
- No test files detected in the current codebase

## Naming Conventions

**Backend files (TypeScript, services):**
- Module files: `{module}.controller.ts`, `{module}.routes.ts`, `{module}.service.ts`
- Model files: `{entity}.model.ts` inside `models/` subdirectory
- Payment service files: `{gateway}.service.ts` (e.g., `khalti.service.ts`, `esewa.service.ts`)
- Shared utilities: lowercase with descriptive names (`auth.ts`, `error.ts`, `emitter.ts`)
- Index barrels: `index.ts` at module root for re-exports

**Frontend files (Next.js, TypeScript/TSX):**
- Page files: `page.tsx` (mandatory Next.js App Router convention)
- Layout files: `layout.tsx` (Next.js App Router convention)
- API route files: `route.ts` (Next.js App Router convention)
- Component files: kebab-case (`cart-drawer.tsx`, `hero-section.tsx`, `image-upload.tsx`)
- Store files: `{domain}.store.ts` (e.g., `auth.store.ts`, `cart.store.ts`)
- API client files: `{domain}.api.ts` (e.g., `product.api.ts`, `order.api.ts`)
- Hook files: `use-{name}.ts` (e.g., `use-toast.ts`, `use-scroll-reveal.ts`)

**Flutter files (Dart):**
- Screen files: `{feature}_screen.dart`
- Core files: `{name}_provider.dart`, `api_client.dart`, `app_router.dart`, `app_theme.dart`

**Directories:**
- Backend modules: lowercase, no separator (`cart`, `orders`, `products`)
- Frontend routes: kebab-case for multi-word (`flash-deals`, `forgot-password`)
- Frontend route groups: parentheses for layout grouping `(buyer)`
- Flutter features: snake_case (`buyer_app`, `delivery_app`, `admin_app`)

## Where to Add New Code

**New backend domain module:**
1. Create `services/api-monolith/src/modules/{new-module}/` directory
2. Add `{new-module}.routes.ts`, `{new-module}.controller.ts`, optional `{new-module}.service.ts`
3. Add Mongoose models in `{new-module}/models/{entity}.model.ts`
4. Register routes in `services/api-monolith/src/app.ts`: `app.use('/api/v1', newModuleRoutes)`
5. Add Next.js rewrite in `web/next.config.js` if needed

**New buyer page:**
- Implementation: `web/src/app/(buyer)/{page-name}/page.tsx`
- Automatically gets Header + Footer + CartDrawer from `web/src/app/(buyer)/layout.tsx`

**New seller page:**
- Implementation: `web/src/app/seller/{page-name}/page.tsx`
- Automatically role-guarded by `web/src/app/seller/layout.tsx`

**New admin page:**
- Implementation: `web/src/app/admin/{page-name}/page.tsx`
- Add nav entry to `NAV_SECTIONS` in `web/src/app/admin/layout.tsx`
- Automatically role-guarded (ADMIN only) by layout

**New API domain functions (web):**
- Implementation: `web/src/lib/api/{domain}.api.ts`
- Import `apiClient` from `web/src/lib/api/client.ts`

**New Zustand store:**
- Implementation: `web/src/store/{domain}.store.ts`
- Use `create<State>()` from zustand; add `persist` middleware only if localStorage persistence is needed

**New reusable UI component:**
- Primitive/base components: `web/src/components/ui/{component-name}.tsx`
- Layout components: `web/src/components/layout/{component-name}.tsx`
- Feature-specific components: `web/src/components/{feature}/{component-name}.tsx`

**New shared utility (for delivery/notification services):**
- Implementation: `packages/shared/src/{category}/{name}.ts`
- Export from `packages/shared/src/index.ts`

**New Kafka event type:**
1. Add payload interface and EVENTS constant to `services/api-monolith/src/shared/events/emitter.ts`
2. Update `EventMap` type in the same file
3. Register handler with `internalBus.on(EVENTS.NEW_EVENT, handler)` in the relevant module's `registerXxxEventHandlers()` function

## Special Directories

**`web/src/app/api/`:**
- Purpose: Next.js API route handlers (thin BFF layer — not the main backend)
- Generated: No
- Committed: Yes
- Note: These handle a small subset of admin-specific calls and support messages; most logic goes through the api-monolith rewrites, not these routes

**`web/data/`:**
- Purpose: Static data files used by the web app
- Generated: No
- Committed: Yes

**`web/public/`:**
- Purpose: Static assets served directly by Next.js
- Generated: No
- Committed: Yes

**`infrastructure/`:**
- Purpose: Kubernetes manifests, Terraform, GitHub Actions CI/CD, Kong gateway config
- Generated: No (except k8s resources applied to cluster)
- Committed: Yes

**`mobile/`:**
- Purpose: Flutter mobile apps — separate build artifacts, not part of npm workspaces
- Generated: No (source), Yes (build outputs in platform-specific subdirs)
- Committed: Source only

---

*Structure analysis: 2026-04-14*
