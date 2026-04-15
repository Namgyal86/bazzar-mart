# Architecture

**Analysis Date:** 2026-04-14

## Pattern Overview

**Overall:** Hybrid Monolith + Selective Microservices with Event-Driven Messaging

**Key Characteristics:**
- A single `api-monolith` Express service (port 8100) consolidates all core business modules that were previously separate microservices
- Two purposefully kept standalone services: `delivery-service` (port 8013, WebSocket/GPS real-time) and `notification-service` (port 8008, push/SMS/email delivery)
- The Next.js frontend (`web`) proxies all API traffic through `next.config.js` rewrites — the browser never speaks directly to backend ports
- Modules within the monolith communicate synchronously via an in-process typed `EventEmitter` (`internalBus`); cross-service events go over Kafka
- Mobile apps (Flutter) are separate clients targeting the same API surface

## Layers

**Infrastructure:**
- Purpose: Databases, cache, message broker, search
- Contains: MongoDB (primary store), Redis (cart sessions), Kafka (async events), Elasticsearch (product search)
- Managed via `docker-compose.yml` and Kubernetes manifests in `infrastructure/k8s/`

**API Monolith (`services/api-monolith`):**
- Purpose: Core business logic — all transactional domains
- Location: `services/api-monolith/src/`
- Contains: Domain modules (routes + controller + service + model per module), shared middleware, Kafka producer, in-process event bus
- Depends on: MongoDB, Redis, Kafka
- Used by: Next.js web frontend (via rewrites), Flutter mobile apps (direct HTTP)

**Delivery Service (`services/delivery-service`):**
- Purpose: Real-time delivery tracking, driver assignment, GPS broadcasting
- Location: `services/delivery-service/src/`
- Contains: Express REST routes, Socket.io server, Kafka consumer (listens to `order.created`), Kafka producer (publishes `delivery.completed`)
- Depends on: MongoDB (delivery_db), Kafka, in-memory agent location store
- Used by: Next.js web (via Next.js rewrites), Flutter delivery_app

**Notification Service (`services/notification-service`):**
- Purpose: User notifications via push, SMS (Sparrow), email (SendGrid)
- Location: `services/notification-service/src/`
- Contains: Express REST routes, Kafka consumers for payment/order/delivery events, Mongoose Notification model
- Depends on: MongoDB (notification_db), Kafka, SendGrid, Firebase, Sparrow SMS
- Used by: Next.js web (via Next.js rewrites)

**Web Frontend (`web`):**
- Purpose: Buyer storefront, seller dashboard, admin console (unified Next.js app)
- Location: `web/src/`
- Contains: Next.js App Router pages segmented by role (`(buyer)`, `seller`, `admin`), Zustand global stores, Axios API client with JWT interceptors, Next.js API route handlers for thin BFF endpoints
- Depends on: api-monolith, delivery-service, notification-service (all via Next.js rewrites)
- Used by: End users in browser

**Shared Package (`packages/shared`):**
- Purpose: Reusable TypeScript utilities for Node.js services
- Location: `packages/shared/src/`
- Contains: Kafka producer/consumer helpers, auth middleware, error handler, Redis client, logger, shared types
- Used by: `delivery-service`, `notification-service`

**Mobile Apps (`mobile/`):**
- Purpose: Native Flutter clients for buyer, seller admin, and delivery agents
- Location: `mobile/buyer_app/`, `mobile/admin_app/`, `mobile/delivery_app/`
- Contains: Feature-based Flutter modules with `presentation/` screens, `core/` network client + router + providers
- Depends on: Same API base URL as web, delivery-service WebSocket

## Data Flow

**Buyer Purchase Flow:**

1. Browser calls `POST /api/v1/orders` — Next.js rewrite proxies to api-monolith
2. `order.controller.ts` creates order in MongoDB, publishes `order.created` to Kafka and emits `ORDER_CREATED` on `internalBus`
3. Buyer initiates payment via `POST /api/v1/payments/khalti/initiate` → `khalti.service.ts` calls Khalti API, returns payment URL
4. Buyer completes payment on Khalti; Khalti calls back `/api/v1/payments/khalti/verify`
5. Payment controller verifies with Khalti, creates Payment document, emits `PAYMENT_SUCCESS` on `internalBus`
6. `registerOrderEventHandlers()` (orders module) catches `PAYMENT_SUCCESS` → sets order status to `CONFIRMED`, publishes `order.status_updated` to Kafka
7. Notification-service Kafka consumer receives `order.status_updated` → creates Notification document
8. Delivery-service Kafka consumer receives `order.created` → creates delivery task

**Cart Flow:**

1. Client calls `GET/POST/PATCH/DELETE /api/v1/cart/*`
2. `cart.controller.ts` delegates to `cart.service.ts`
3. Cart service reads/writes cart data as JSON to Redis with a 30-day TTL key `cart:{userId}`
4. On write, `publishEvent('cart.updated', ...)` fires to Kafka (non-blocking, errors suppressed)

**Real-Time Delivery Tracking:**

1. Buyer subscribes via Socket.io: `socket.emit('subscribe_order', orderId)` → joins room `order:{orderId}`
2. Delivery agent app sends GPS: `socket.emit('agent_location_update', { orderId, lat, lng })`
3. delivery-service broadcasts to room: `io.to('order:{orderId}').emit('location_update', {...})`

**Authentication:**

1. Login: `POST /api/v1/auth/login` → returns `accessToken` (JWT) + `refreshToken`
2. `useAuthStore` (Zustand + localStorage persist) stores both tokens
3. `apiClient` (Axios) attaches `Authorization: Bearer {accessToken}` on every request via interceptor
4. On 401: interceptor calls `/api/v1/auth/token/refresh` automatically, retries, or redirects to `/auth/login`
5. Kong gateway (production): passes `x-user-id` + `x-user-role` headers; `auth.middleware.ts` accepts either form

**State Management:**

- Client state is Zustand stores (no Redux): `auth.store.ts`, `cart.store.ts`, `wishlist.store.ts`, `theme.store.ts`
- Auth store uses `zustand/middleware` `persist` to localStorage under key `bazzar-auth`
- Cart store mirrors server cart — fetches on load, mutates via API, re-fetches after write

## Key Abstractions

**Domain Module (api-monolith):**
- Purpose: Self-contained business domain grouping routes + controller + service + Mongoose models
- Examples: `services/api-monolith/src/modules/cart/`, `services/api-monolith/src/modules/orders/`, `services/api-monolith/src/modules/payments/`
- Pattern: `{module}.routes.ts` → `{module}.controller.ts` → `{module}.service.ts` (or direct Mongoose calls) → `models/{entity}.model.ts`

**AuthRequest (shared middleware):**
- Purpose: Typed Express Request extension carrying authenticated user info
- Examples: `services/api-monolith/src/shared/middleware/auth.ts`
- Pattern: `req.user = { userId, role, email }` populated by `authenticate` middleware; controllers cast `req as AuthRequest`

**Zod Validation Schemas (controllers):**
- Purpose: Runtime request body validation inline in controllers (not a separate validation layer)
- Examples: `services/api-monolith/src/modules/cart/cart.controller.ts`, `order.controller.ts`
- Pattern: `z.object({...}).safeParse(req.body)` → 400 on failure, typed `parsed.data` on success

**internalBus (in-process events):**
- Purpose: Decouples modules within the monolith; replaces inter-service HTTP calls
- Examples: `services/api-monolith/src/shared/events/emitter.ts`
- Pattern: Producers call `internalBus.emit(EVENTS.PAYMENT_SUCCESS, payload)`; consumers register handlers with `internalBus.on(EVENTS.PAYMENT_SUCCESS, handler)` at startup in `registerXxxEventHandlers()`

**API Client (web):**
- Purpose: Single Axios instance with JWT attach + auto-refresh interceptors
- Examples: `web/src/lib/api/client.ts`
- Pattern: All API modules import `apiClient` from `client.ts` and call typed methods; never create raw `axios.create`

**Next.js Rewrites (API Gateway proxy):**
- Purpose: Single browser-facing origin; hides backend ports; routes to monolith or separate services
- Examples: `web/next.config.js`
- Pattern: `/api/v1/{domain}/*` → `MONOLITH_URL`, `/api/v1/delivery/*` → `DELIVERY_SERVICE_URL`, `/api/v1/notifications/*` → `NOTIFICATION_SERVICE_URL`

## Entry Points

**api-monolith server:**
- Location: `services/api-monolith/src/app.ts` (app factory) + `services/api-monolith/src/server.ts` (boot)
- Triggers: `node dist/server.js` or `ts-node src/server.ts`
- Responsibilities: Connects MongoDB, Redis, Kafka producer; registers all module event handlers; starts HTTP server on port 8100

**delivery-service server:**
- Location: `services/delivery-service/src/index.ts`
- Triggers: `node dist/index.js`
- Responsibilities: Connects MongoDB (delivery_db), starts Socket.io, starts Kafka consumers, loads existing orders into memory

**notification-service server:**
- Location: `services/notification-service/src/index.ts`
- Triggers: `node dist/index.js`
- Responsibilities: Connects MongoDB (notification_db), starts Kafka consumers for payment/order events

**Next.js web:**
- Location: `web/src/app/layout.tsx` (root layout), `web/src/app/(buyer)/page.tsx` (homepage)
- Triggers: `next dev` / `next start`
- Responsibilities: Serves buyer storefront, seller dashboard, admin console; proxies API via rewrites

**Flutter mobile apps:**
- Location: `mobile/buyer_app/lib/main.dart`, `mobile/admin_app/lib/main.dart`, `mobile/delivery_app/lib/main.dart`
- Triggers: `flutter run`
- Responsibilities: Platform-specific UI for each user role; all network via `core/network/api_client.dart`

## Error Handling

**Strategy:** Centralized error middleware in monolith; try/catch blocks in controllers returning `{ success: false, error: string }`

**Patterns:**
- All controllers return `{ success: true, data: ... }` on success and `{ success: false, error: string }` on failure
- `notFound` middleware catches undefined routes: `services/api-monolith/src/shared/middleware/error.ts`
- `errorHandler` middleware catches unhandled errors: `services/api-monolith/src/shared/middleware/error.ts`
- Frontend `getErrorMessage()` helper in `web/src/lib/api/client.ts` normalizes Axios errors for display
- Kafka publish failures are non-fatal — caught and logged, never thrown to callers
- `internalBus` handlers are wrapped in try/catch; failures logged but not re-thrown

## Cross-Cutting Concerns

**Logging:** `morgan('dev')` HTTP request logging in api-monolith; `console.log/warn/error` throughout services; `packages/shared/src/logger/index.ts` provides a shared logger for standalone services

**Validation:** Zod schemas defined inline in controllers (no separate validation layer or middleware pipeline); `packages/shared/src/middleware/validate.ts` available for standalone services but not wired in monolith

**Authentication:** `authenticate` middleware from `services/api-monolith/src/shared/middleware/auth.ts` on all protected routes; supports Kong gateway headers (`x-user-id`, `x-user-role`) or `Authorization: Bearer <JWT>`; role enforcement via `requireRole(...roles)` middleware on admin/seller-specific routes

**Rate Limiting:** `express-rate-limit` applied only to auth mutation endpoints (`/auth/register`, `/auth/login`) — 20 requests per 15-minute window; no general API rate limiting

**CORS:** Configured in `services/api-monolith/src/app.ts` — allows `WEB_URL` env var + `localhost:3000`; development mode allows all origins

---

*Architecture analysis: 2026-04-14*
