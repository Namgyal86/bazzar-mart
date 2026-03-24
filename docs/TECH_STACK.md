# Technology Stack

> **Stack: MERN + Flutter**
> Backend: MongoDB · Express.js · Node.js (TypeScript)
> Web Frontend: React (Next.js)
> Mobile: Flutter — 4 apps (Buyer, Seller, Admin, Delivery)

---

## Backend (Node.js + Express — per microservice)

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| Runtime | Node.js | 20 LTS | Non-blocking I/O, massive npm ecosystem |
| Framework | Express.js | 4.x | Minimal, flexible, battle-tested |
| Language | TypeScript | 5.x | Type safety across all services |
| ODM | Mongoose | 8.x | Schema validation, virtuals, hooks |
| Auth | jsonwebtoken + bcryptjs | — | JWT issuance + password hashing |
| Validation | Zod | 3.x | Runtime schema validation on all inputs |
| Async Jobs | BullMQ | 4.x | Redis-backed job queues (replaces Celery) |
| WebSockets | Socket.io | 4.x | Real-time delivery tracking, order status |
| File Upload | Multer + AWS SDK v3 | — | S3 multipart upload |
| HTML Sanitizer | sanitize-html | — | Storefront custom HTML blocks |
| Template Engine | Handlebars (hbs) | — | Storefront static HTML rendering |
| HTTP Client | Axios | 1.x | Inter-service REST calls |
| Logging | Winston + morgan | — | Structured JSON logs |
| Monitoring | prom-client | — | Prometheus `/metrics` endpoint |
| Testing | Jest + Supertest | — | Unit + integration tests |
| Linting | ESLint + Prettier | — | Code quality enforcement |

---

## Database

| Component | Technology | Version | Reason |
|-----------|-----------|---------|--------|
| Primary DB | **MongoDB** | 7.x | Flexible schema, horizontal scaling, BSON |
| Hosting (prod) | MongoDB Atlas | — | Managed, auto-backup, global clusters |
| Cache / Sessions | Redis | 7.x | BullMQ broker, session store, rate limiting |
| Search Engine | Elasticsearch | 8.x | Full-text product search, faceted filters |

> **One MongoDB database per microservice** — separate Atlas projects in prod, separate `mongod` ports in local Docker Compose. Services never read each other's databases.

---

## Web Frontend (Buyer Web + Seller/Admin Dashboard)

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| Framework | Next.js | 14+ | SSR/SSG, SEO, App Router |
| Language | TypeScript | 5.x | Type safety |
| State (global) | Zustand | 4.x | Lightweight, simple |
| State (server) | TanStack Query | 5.x | Server state caching + invalidation |
| Drag & Drop | dnd-kit | 6.x | Storefront designer |
| Rich Text | TipTap | 2.x | About-seller section editor |
| UI Components | shadcn/ui + Tailwind CSS | — | Accessible, customizable |
| Forms | React Hook Form + Zod | — | Performant validated forms |
| Charts | Recharts | 2.x | Seller & admin analytics |
| Real-time | Socket.io-client | 4.x | Live order/delivery status |
| HTTP Client | Axios | 1.x | API calls with interceptors |

---

## Mobile (Flutter — 4 Separate Apps)

| App | Actor | Platform |
|-----|-------|----------|
| **buyer_app** | Buyer | iOS + Android |
| **seller_app** | Seller | iOS + Android |
| **admin_app** | Admin | iOS + Android |
| **delivery_app** | Delivery Guy | iOS + Android |

All four apps hit the **same backend APIs** through the API Gateway. No backend changes are needed per app — the APIs are platform-agnostic REST + WebSocket.

### Core Flutter Packages (all apps)

| Package | Purpose |
|---------|---------|
| `dio` | HTTP client — REST API calls, interceptors |
| `flutter_riverpod` | State management |
| `go_router` | Declarative navigation |
| `flutter_secure_storage` | Securely store JWT access + refresh tokens |
| `firebase_messaging` | Push notifications via FCM |
| `socket_io_client` | Real-time updates (delivery tracking, order status) |
| `freezed` + `json_serializable` | Immutable model classes + JSON parsing |
| `hive` | Offline-first local storage |
| `connectivity_plus` | Detect offline state |
| `cached_network_image` | Image caching |
| `shimmer` | Loading skeleton UI |
| `intl` | Date and currency formatting |

### Buyer App Extras

| Package | Purpose |
|---------|---------|
| `google_maps_flutter` | Live delivery tracking map |
| `geolocator` | Detect buyer's location for delivery ETA |
| `razorpay_flutter` / `stripe_sdk` | In-app payment UI |
| `flutter_local_notifications` | Local order status alerts |
| `image_picker` | Upload review photos |

### Delivery App Extras

| Package | Purpose |
|---------|---------|
| `google_maps_flutter` | Turn-by-turn navigation overlay |
| `geolocator` | Continuous GPS tracking (streamed to backend via Socket.io) |
| `flutter_background_service` | Keep GPS alive when app is backgrounded |
| `url_launcher` | Open Google Maps / Waze for navigation |
| `vibration` | Haptic alert on new delivery assignment |

### API Communication Pattern (Flutter → Backend)

```dart
// lib/core/network/api_client.dart
// Shared across all 4 apps

class ApiClient {
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.platform.com/api/v1',
  );

  late final Dio _dio;

  ApiClient(Ref ref) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
    ));

    _dio.interceptors.addAll([
      AuthInterceptor(ref),     // Attach Bearer <token> to every request
      RefreshInterceptor(ref),  // Auto-refresh on 401 using refresh token
      LoggingInterceptor(),     // Log requests in debug mode
      RetryInterceptor(),       // Retry once on network timeout
    ]);
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? params}) =>
      _dio.get(path, queryParameters: params);

  Future<Response<T>> post<T>(String path, {dynamic data}) =>
      _dio.post(path, data: data);

  Future<Response<T>> patch<T>(String path, {dynamic data}) =>
      _dio.patch(path, data: data);
}
```

### Real-time Socket (Flutter)

```dart
// lib/core/network/socket_client.dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketClient {
  late IO.Socket socket;

  void connect(String token) {
    socket = IO.io('https://api.platform.com', IO.OptionBuilder()
      .setTransports(['websocket'])
      .setAuth({'token': token})
      .build());

    socket.onConnect((_) => debugPrint('Socket connected'));
    socket.onDisconnect((_) => debugPrint('Socket disconnected'));
  }

  // Delivery app: stream GPS every 5 seconds
  void streamLocation(double lat, double lng, String deliveryId) {
    socket.emit('delivery:location_update', {
      'deliveryId': deliveryId,
      'lat': lat,
      'lng': lng,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  // Buyer app: listen for delivery position updates
  void onDeliveryMoved(void Function(Map data) callback) {
    socket.on('delivery:location_broadcast', (data) => callback(data));
  }
}
```

---

## Infrastructure

| Component | Technology | Reason |
|-----------|-----------|--------|
| Event Streaming | Apache Kafka | Async inter-service communication |
| Job Queue | BullMQ (Redis) | Per-service background job processing |
| Object Storage | AWS S3 | Product images, storefront assets |
| CDN | AWS CloudFront | Static assets, published storefronts |
| API Gateway | Kong | JWT validation, rate limiting, routing |
| Push Notifications | Firebase Cloud Messaging (FCM) | All 4 Flutter apps |
| Container Runtime | Docker | Dev parity |
| Orchestration | Kubernetes (AWS EKS) | Autoscaling, self-healing |
| IaC | Terraform | Reproducible AWS infrastructure |
| CI/CD | GitHub Actions | Build, test, deploy pipeline |
| Secrets | AWS Secrets Manager | DB credentials, API keys |
| Monitoring | Prometheus + Grafana | Metrics, dashboards, alerts |
| Logging | Winston → CloudWatch | Centralized log aggregation |
| Tracing | Jaeger (OpenTelemetry) | Distributed request tracing |

---

## Monorepo Structure

```
ecommerce-platform/
├── services/
│   ├── user-service/              # Node.js + Express + Mongoose
│   ├── product-service/
│   ├── cart-service/
│   ├── order-service/
│   ├── payment-service/
│   ├── review-service/
│   ├── seller-service/
│   ├── notification-service/
│   ├── search-service/
│   ├── recommendation-service/
│   ├── storefront-designer-service/
│   ├── referral-service/
│   └── delivery-service/          # ← NEW (Delivery actor)
│
├── web/                           # Next.js (Buyer web + Seller/Admin dashboards)
│
├── mobile/
│   ├── buyer_app/                 # Flutter
│   ├── seller_app/                # Flutter
│   ├── admin_app/                 # Flutter
│   └── delivery_app/              # Flutter ← NEW
│
└── infrastructure/
    ├── k8s/                       # Kubernetes manifests
    ├── terraform/                 # AWS IaC
    └── docker-compose.yml         # Local dev
```

---

## Node.js Service Structure (replaces Django)

```
{service-name}/
├── src/
│   ├── config/
│   │   ├── db.ts              # Mongoose connection
│   │   ├── redis.ts           # BullMQ + session Redis
│   │   └── env.ts             # Zod-validated env vars (fail fast on missing)
│   │
│   ├── models/                # Mongoose schemas + TypeScript interfaces
│   │   └── {entity}.model.ts
│   │
│   ├── services/              # ALL business logic — no req/res objects here
│   │   └── {entity}.service.ts
│   │
│   ├── repositories/          # ALL DB queries via Mongoose — no logic
│   │   └── {entity}.repository.ts
│   │
│   ├── controllers/           # Thin: validate → service → respond
│   │   └── {entity}.controller.ts
│   │
│   ├── routes/
│   │   └── {entity}.routes.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts      # Verify JWT, attach req.user
│   │   ├── validate.middleware.ts  # Zod schema validation
│   │   └── errorHandler.ts        # Central error → HTTP response mapper
│   │
│   ├── jobs/                  # BullMQ workers (async tasks)
│   │   └── {entity}.jobs.ts
│   │
│   └── kafka/
│       ├── producer.ts
│       └── consumers/
│           └── {event}.consumer.ts
│
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── package.json
└── tsconfig.json
```
