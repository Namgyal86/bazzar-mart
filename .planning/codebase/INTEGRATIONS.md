# External Integrations

**Analysis Date:** 2026-04-14

## APIs & External Services

**Payment Gateways (Nepal-focused):**

- **Khalti** — Digital wallet and card payment (primary gateway)
  - SDK/Client: `axios` direct HTTP calls; custom service at `services/api-monolith/src/modules/payments/services/khalti.service.ts`
  - Mobile SDK: `khalti_flutter` 3.x in `mobile/buyer_app/pubspec.yaml`
  - Auth: `KHALTI_SECRET_KEY` env var (header: `Authorization: Key <secret>`)
  - Sandbox URL: `https://dev.khalti.com/api/v2`; Production: `https://khalti.com/api/v2`
  - Flow: initiate (`/epayment/initiate/`) → redirect to payment_url → lookup (`/epayment/lookup/`) to verify

- **eSewa** — Nepal's most widely used digital wallet
  - SDK/Client: custom service at `services/api-monolith/src/modules/payments/services/esewa.service.ts`
  - Auth: `ESEWA_SECRET_KEY`, `ESEWA_MERCHANT_CODE` env vars; HMAC-SHA256 signature on transaction fields
  - Sandbox URL: `https://rc-epay.esewa.com.np/api/epay/main/v2/form`; Production: `https://epay.esewa.com.np/api/epay/main/v2/form`
  - Flow: form POST with signed payload → callback with base64-encoded response → verify signature → status check via `rc.esewa.com.np/api/epay/transaction/status/`
  - Defaults: `ESEWA_MERCHANT_CODE=EPAYTEST`, `ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q(` (sandbox; override in production)

- **Fonepay** — Additional Nepal payment network
  - SDK/Client: not yet implemented (env vars declared but no service file found)
  - Auth: `FONEPAY_MERCHANT_CODE`, `FONEPAY_SECRET_KEY` env vars

**Email:**
- **SendGrid** — Transactional email (declared in notification-service, not yet wired into consumer handlers)
  - Auth: `SENDGRID_API_KEY` env var
  - Integration point: `services/notification-service/` (Kafka consumer handles events but current code only writes to MongoDB — SendGrid calls not yet implemented)

**SMS:**
- **Sparrow SMS** — Nepal SMS gateway
  - Auth: `SPARROW_SMS_TOKEN` env var
  - Integration point: `services/notification-service/` (declared, not yet wired)

**Maps & Location:**
- **Google Maps** — Used in `mobile/buyer_app` (order tracking) and `mobile/delivery_app` (driver navigation)
  - SDK: `google_maps_flutter` 2.5.x (pub.dev)
  - No server-side Google Maps API key detected; key configured at Flutter app level (native Android/iOS config)
- **Leaflet / OpenStreetMap** — Web frontend map rendering (no API key required)
  - Packages: `leaflet` 1.9.x + `react-leaflet` 4.x in `web/package.json`

**CDN / Image Storage:**
- **AWS S3 + CloudFront** — Production file storage for product images (configured but not live)
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `CLOUDFRONT_URL` env vars
  - Current state: `services/api-monolith/src/modules/upload/upload.routes.ts` stores to local disk (`/tmp/bazzar-uploads` or `UPLOAD_DIR`); S3 integration noted as TODO comment
- **Cloudinary** — Listed as allowed image hostname in `web/next.config.js` (`*.cloudinary.com`, `res.cloudinary.com`); not yet integrated

## Data Storage

**Databases:**

- **MongoDB 7** — Primary database for all services
  - Development: Docker container (`mongo:7`) on port 27017
  - Production: AWS DocumentDB (MongoDB-compatible)
  - api-monolith connection: `MONGO_URI` → `bazzar_db` (single shared connection, pool size 20) — `services/api-monolith/src/config/db.ts`
  - delivery-service: `MONGO_URI_DELIVERY` → `delivery_db`
  - notification-service: `MONGO_URI_NOTIFICATION` → `notification_db`
  - Client: Mongoose 8.1.x ODM

- **Redis 7** — Cart session cache and job queue backing store
  - Development: Docker container (`redis:7-alpine`) on port 6379
  - Production: AWS ElastiCache
  - Connection: `REDIS_URL` env var — `services/api-monolith/src/config/redis.ts`
  - Client: ioredis 5.3.x; lazy connect, no auto-retry on startup failure (cart degrades gracefully)
  - Additional usage: BullMQ job queues declared in `packages/shared`

**File Storage:**
- Local disk (`/app/uploads` Docker volume) in development — Docker volume `uploads_data`
- Production target: AWS S3 + CloudFront (env vars present, code not yet migrated)

**Search:**
- Elasticsearch 8.11.0 — Docker container on port 9200 (in `docker-compose.yml`)
- Current search implementation: direct Mongoose regex queries on `Product` collection (`services/api-monolith/src/modules/search/search.controller.ts`); Elasticsearch is provisioned but not yet integrated into search queries

**Caching:**
- Redis (via ioredis) — cart data; BullMQ job queues

## Authentication & Identity

**Auth Provider:** Custom JWT (no third-party auth provider)
- Implementation: `services/api-monolith/src/modules/users/` issues JWTs; `services/api-monolith/src/shared/middleware/auth.ts` verifies them
- Access token secret: `JWT_ACCESS_SECRET` (required, min 8 chars)
- Refresh token secret: `JWT_REFRESH_SECRET` (optional, falls back to access secret)
- Web frontend auto-refresh interceptor: `web/src/lib/api/client.ts` — 401 → `POST /api/v1/auth/token/refresh`
- Mobile apps store tokens via `flutter_secure_storage`
- Password hashing: `bcryptjs` 2.x

**Firebase:**
- **Firebase Cloud Messaging (FCM)** — Push notifications for buyer app
  - Auth: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` env vars (notification-service)
  - Mobile: `firebase_core` + `firebase_messaging` in `mobile/buyer_app/pubspec.yaml`
  - Server-side: declared in notification-service env but not yet wired into consumer handlers

## Message Broker / Event Bus

**Apache Kafka** (Confluent Platform 7.5.0)
- Development: Docker containers (`cp-kafka:7.5.0` + `cp-zookeeper:7.5.0`); external port 9092, internal 29092
- Production: AWS MSK
- Connection: `KAFKA_BROKERS` env var
- Client: kafkajs 2.2.x
- Services using Kafka:
  - `services/api-monolith` — producer (`services/api-monolith/src/kafka/producer.ts`) + consumers (`services/api-monolith/src/kafka/consumers/`)
  - `services/delivery-service/src/kafka/` — producer + consumer
  - `services/notification-service/src/kafka/consumers/index.ts` — consumer only
- Topics consumed by notification-service: `user.registered`, `order.created`, `order.status_changed`, `order.cancelled`, `payment.success`, `payment.failed`, `delivery.assigned`, `delivery.completed`, `referral.reward_issued`, `seller.approved`
- Internal events between merged monolith modules handled via Node.js `EventEmitter` (not Kafka) — registered in `services/api-monolith/src/server.ts`

## Real-Time Communication

**Socket.IO 4.6.x** (server in delivery-service, client in web + buyer_app + delivery_app)
- Server: `services/delivery-service/` — driver location updates and order status events
- Web client: `socket.io-client` in `web/package.json`; connects to `NEXT_PUBLIC_WS_URL` (e.g. `ws://localhost:8013`)
- Mobile clients: `socket_io_client` 2.x in `mobile/buyer_app/pubspec.yaml` and `mobile/delivery_app/pubspec.yaml`
- Production WebSocket URL: `wss://bazzar.com.np/api/v1/delivery`

## Monitoring & Observability

**Error Tracking:** None detected (no Sentry, Datadog, or equivalent package)

**Logs:**
- `morgan` 1.x — HTTP access logs in api-monolith
- `winston` 3.11.x — structured application logging declared in `packages/shared/src/logger/`
- `console.log/warn/error` — used directly in delivery-service and notification-service

**Slack Notifications:**
- Deployment status notifications via `slackapi/slack-github-action@v1.27.0`
- Auth: `SLACK_WEBHOOK_URL` GitHub Actions secret
- Trigger: on push to `main` after deploy jobs complete (`infrastructure/github-actions/deploy.yml`)

## CI/CD & Deployment

**Hosting:**
- Backend services: AWS EKS (Kubernetes), region `ap-south-1`
- Web frontend: Vercel (primary) AND optionally EKS via `infrastructure/k8s/ingress.yaml`
- Domain: `bazzar.com.np`; API: `api.bazzar.com.np`

**CI Pipeline:**
- GitHub Actions — `infrastructure/github-actions/deploy.yml`
- Jobs: test → build → deploy-to-EKS + deploy-to-Vercel → Slack notify
- Trigger: push or PR to `main` branch
- Image registry: GitHub Container Registry (`ghcr.io`)
- AWS auth: OIDC (`secrets.AWS_DEPLOY_ROLE_ARN`), no long-lived AWS keys

**PR Checks:**
- `infrastructure/github-actions/pr-checks.yml`

**Infrastructure as Code:**
- Terraform 1.7+ — `infrastructure/terraform/main.tf`
- Provisions: VPC, EKS (t3.medium nodes), DocumentDB, ElastiCache, MSK Kafka, ECR repos

## Environment Configuration

**Required env vars (api-monolith):**
- `JWT_ACCESS_SECRET` — min 8 chars, required; process exits if absent
- `MONGO_URI` — MongoDB connection string, required
- `REDIS_URL` — defaults to `redis://localhost:6379`
- `KAFKA_BROKERS` — defaults to `localhost:9092`

**Required env vars (notification-service):**
- `MONGO_URI_NOTIFICATION`
- `KAFKA_BROKERS`
- `SENDGRID_API_KEY` — email (optional at startup)
- `SPARROW_SMS_TOKEN` — SMS (optional at startup)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — FCM (optional at startup)

**Required env vars (delivery-service):**
- `MONGO_URI_DELIVERY`, `MONGO_URI_ORDER`
- `KAFKA_BROKERS`, `JWT_ACCESS_SECRET`

**Payment env vars (optional at startup, required at runtime):**
- `KHALTI_SECRET_KEY`
- `ESEWA_SECRET_KEY`, `ESEWA_MERCHANT_CODE`
- `FONEPAY_MERCHANT_CODE`, `FONEPAY_SECRET_KEY`

**File storage env vars (optional — local disk used if absent):**
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `CLOUDFRONT_URL`

**Secrets location:**
- Development: `.env` file at repo root (not committed; `.env.example` is the template)
- Production: GitHub Actions secrets + Kubernetes ConfigMap (`infrastructure/k8s/configmap.yaml`) + Vercel environment

## Webhooks & Callbacks

**Incoming (payment callbacks):**
- eSewa callback: `POST /api/v1/payments/esewa/callback` — receives base64-encoded signed payload; HMAC-SHA256 signature verified before processing
- Khalti: redirect-based (no incoming webhook); frontend sends `pidx` to backend for lookup
- Fonepay: not yet implemented

**Outgoing:**
- None detected (no outgoing webhooks to external systems)

---

*Integration audit: 2026-04-14*
