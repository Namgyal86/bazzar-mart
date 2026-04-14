# Technology Stack

**Analysis Date:** 2026-04-14

## Languages

**Primary:**
- TypeScript 5.3.x — All backend services (`services/api-monolith`, `services/delivery-service`, `services/notification-service`) and web frontend (`web/`)
- Dart 3.0+ — All four Flutter mobile apps (`mobile/buyer_app`, `mobile/seller_app`, `mobile/admin_app`, `mobile/delivery_app`)

**Secondary:**
- JavaScript — Root workspace scripts, `seed.js`, `seed-all-dbs.js`, `seed-grocery.js`, `web/next.config.js`, `web/postcss.config.js`

## Runtime

**Environment:**
- Node.js >=20.0.0 (enforced in root `package.json` engines field)
- Flutter >=3.10.0 (buyer_app); Dart SDK >=3.0.0 <4.0.0 (all mobile apps)

**Package Manager:**
- npm >=10.0.0 (root `package.json` engines field)
- Lockfile: `package-lock.json` present at root
- Note: `services/api-monolith` has no lockfile; CI uses `npm install` there, `npm ci --legacy-peer-deps` elsewhere

## Monorepo Structure

**Workspace manager:** npm workspaces (defined in root `package.json`)
- `packages/*` — shared library (`@bazzar/shared`)
- `services/*` — backend services (`@bazzar/api-monolith`, `@bazzar/delivery-service`, `@bazzar/notification-service`)
- `web` — Next.js frontend (`@bazzar/web`)
- Mobile apps live in `mobile/` and are standalone Flutter projects (not npm workspaces)

## Frameworks

**Backend — Core:**
- Express 4.18.x — HTTP server for all three Node.js services
  - `services/api-monolith/src/app.ts` (modular monolith, port 8100)
  - `services/delivery-service/src/index.ts` (port 8013)
  - `services/notification-service/src/index.ts` (port 8008)

**Backend — Realtime:**
- Socket.IO 4.6.x (server) — delivery-service for driver-side WebSocket tracking

**Frontend — Web:**
- Next.js 14.1.0 — App Router, server-side rewrites proxy all `/api/v1/*` calls to backend services (`web/next.config.js`)
- React 18.2.x
- TailwindCSS 3.4.x with PostCSS — `web/tailwind.config.ts`, `web/postcss.config.js`
- Radix UI (full component suite) — unstyled accessible primitives (`web/package.json`)
- Framer Motion 12.x — animations
- Recharts 2.x — analytics charts

**Frontend — Mobile:**
- Flutter 3.10+ — all four mobile apps use Material Design
  - `mobile/buyer_app/` — shopper-facing
  - `mobile/seller_app/` — seller product/order management
  - `mobile/admin_app/` — platform admin dashboard
  - `mobile/delivery_app/` — GPS tracking, delivery agent

**Testing:**
- No test framework detected in any service or web package (no jest/vitest config found); CI pipeline runs `npm test --if-present` which silently skips

**Build/Dev:**
- ts-node-dev 2.x — dev server with hot reload for all three backend services
- TypeScript compiler (`tsc`) — production build for all backend services and `@bazzar/shared`
- Terraform 1.7+ (`infrastructure/terraform/main.tf`) — AWS infra provisioning

## Key Dependencies

**Critical (Shared):**
- `zod` 3.22.x — env validation (`services/api-monolith/src/config/env.ts`) and schema validation across services
- `jsonwebtoken` 9.x — JWT access/refresh token issuance and verification (all services share `JWT_ACCESS_SECRET`)
- `kafkajs` 2.2.x — Kafka producer/consumer in all three services and `@bazzar/shared`
- `mongoose` 8.1.x — MongoDB ODM used by all three services
- `ioredis` 5.3.x — Redis client used by api-monolith (cart session) and `@bazzar/shared`
- `bullmq` 5.1.x — Redis-backed job queue, declared in `packages/shared/package.json`

**Web-specific:**
- `axios` 1.6.x — HTTP client; custom instance at `web/src/lib/api/client.ts` with JWT interceptor and auto-refresh
- `zustand` 4.5.x — client-side state (`web/src/store/auth.store.ts`, `cart.store.ts`, `wishlist.store.ts`, `theme.store.ts`)
- `@tanstack/react-query` 5.x — server-state fetching and caching
- `react-hook-form` 7.x + `@hookform/resolvers` 3.x — form handling with Zod validation
- `socket.io-client` 4.6.x — connects to delivery-service WebSocket
- `leaflet` / `react-leaflet` 4.x — map rendering (web, buyer-facing tracking)
- `@dnd-kit/*` — drag-and-drop for product/storefront management

**Backend-specific:**
- `bcryptjs` 2.x — password hashing (`api-monolith`)
- `multer` 1.4.x — local disk file upload (`services/api-monolith/src/modules/upload/upload.routes.ts`); ephemeral Docker volume, swap to S3 in production
- `helmet` 7.x — HTTP security headers (all three services)
- `express-rate-limit` 7.x — rate limiting (`api-monolith`)
- `morgan` 1.x — HTTP request logging (`api-monolith`)
- `winston` 3.11.x — structured logging (`packages/shared`)

**Mobile-specific:**
- `flutter_riverpod` 2.4-2.5 + `riverpod_annotation` — state management (all mobile apps)
- `go_router` 12-14 — navigation (all mobile apps)
- `dio` 5.4.x — HTTP client (all mobile apps)
- `hive` / `hive_flutter` — local key-value persistence (all mobile apps)
- `flutter_secure_storage` 9.x — secure token storage (all mobile apps)
- `firebase_core` + `firebase_messaging` — FCM push notifications (buyer_app only)
- `google_maps_flutter` 2.5.x — maps (buyer_app, delivery_app)
- `geolocator` — GPS location (buyer_app, delivery_app)
- `khalti_flutter` 3.x — Khalti payment SDK (buyer_app only)
- `socket_io_client` 2.x — real-time delivery tracking (buyer_app, delivery_app)
- `background_location` 0.9.x — background GPS tracking (delivery_app only)
- `fl_chart` 0.68.x — charts (seller_app, admin_app)

## Configuration

**Environment:**
- Root `.env.example` documents all required variables (copy to `.env`)
- Backend env validated with Zod at startup; missing required vars cause immediate `process.exit(1)` — `services/api-monolith/src/config/env.ts`
- Frontend uses `NEXT_PUBLIC_API_BASE_URL` (empty = proxied via Next.js rewrites in development)
- Key required vars: `JWT_ACCESS_SECRET`, `MONGO_URI`, `REDIS_URL`, `KAFKA_BROKERS`
- Payment vars optional at startup but needed at runtime for payments

**TypeScript:**
- Root `tsconfig.base.json` — shared compiler options (ES2022 target, strict, commonjs, decorator support)
- Each service and the web app extends or uses its own `tsconfig.json`

**Linting/Formatting:**
- ESLint 8.56.x + `@typescript-eslint` parser and plugin — root config, `eslint-config-next` for web
- Prettier 3.2.x — formats `*.ts`, `*.tsx`, `*.json`

**Build:**
- Docker: each service has its own `Dockerfile`; `docker-compose.yml` at root orchestrates full local stack
- Kubernetes manifests in `infrastructure/k8s/services/` (api-monolith, delivery-service, notification-service)
- Ingress config: `infrastructure/k8s/ingress.yaml`

## Platform Requirements

**Development:**
- Docker + Docker Compose (full stack via `npm run docker:up`)
- Node.js 20+, npm 10+
- Flutter 3.10+ with Dart 3.0+ (for mobile apps)

**Production:**
- AWS EKS (Kubernetes) — backend services (`infrastructure/terraform/main.tf`, `infrastructure/k8s/`)
  - Region: `ap-south-1` (Mumbai)
  - EKS cluster: `bazzar-eks-cluster`
- Vercel — Next.js web frontend (deployed via `infrastructure/github-actions/deploy.yml`)
- AWS DocumentDB (MongoDB-compatible) — production database
- AWS ElastiCache — production Redis
- AWS MSK — production Kafka
- GitHub Container Registry (ghcr.io) — Docker image registry

---

*Stack analysis: 2026-04-14*
