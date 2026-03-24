# Flutter API Integration Guide

> All 4 Flutter apps (`buyer_app`, `seller_app`, `admin_app`, `delivery_app`) consume the same backend APIs.
> Base URL: `https://api.platform.com/api/v1`
> This file explains HOW to call the APIs from Flutter — patterns, auth, real-time, and per-app screen → API mapping.

---

## 1. Project Setup (all 4 apps)

### pubspec.yaml — Core Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter

  # HTTP & API
  dio: ^5.4.0                         # HTTP client with interceptors
  
  # State Management
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0

  # Navigation
  go_router: ^13.0.0

  # Auth & Secure Storage
  flutter_secure_storage: ^9.0.0     # Store JWT tokens encrypted

  # Real-time (Socket.io)
  socket_io_client: ^2.0.3

  # Push Notifications
  firebase_messaging: ^14.8.0
  firebase_core: ^2.24.0
  flutter_local_notifications: ^17.0.0

  # Data Models
  freezed_annotation: ^2.4.0
  json_annotation: ^4.8.0

  # Local Storage (offline support)
  hive_flutter: ^1.1.0

  # Maps (buyer_app and delivery_app only)
  google_maps_flutter: ^2.6.0
  geolocator: ^11.0.0

  # Images
  cached_network_image: ^3.3.1
  image_picker: ^1.0.7               # Review photos, proof of delivery

  # UI Helpers
  shimmer: ^3.0.0                    # Loading skeletons
  intl: ^0.19.0                      # Date & currency formatting
  connectivity_plus: ^6.0.0

  # Delivery app only
  flutter_background_service: ^5.0.5
  url_launcher: ^6.2.6               # Open Google Maps for navigation

dev_dependencies:
  build_runner: ^2.4.0
  freezed: ^2.4.0
  json_serializable: ^6.7.0
  riverpod_generator: ^2.3.0
```

---

## 2. Core API Client

```dart
// lib/core/network/api_client.dart
// Shared across all 4 apps — copy this file into each app's lib/core/

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://api.platform.com/api/v1',
);

class ApiClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        // Auto-refresh on 401
        if (e.response?.statusCode == 401) {
          final refreshed = await _refreshToken();
          if (refreshed) {
            final token = await _storage.read(key: 'access_token');
            e.requestOptions.headers['Authorization'] = 'Bearer $token';
            final retryResponse = await _dio.fetch(e.requestOptions);
            return handler.resolve(retryResponse);
          }
        }
        return handler.next(e);
      },
    ));
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null) return false;
      final res = await Dio().post('$_baseUrl/auth/token/refresh', data: {'refreshToken': refreshToken});
      await _storage.write(key: 'access_token', value: res.data['data']['accessToken']);
      return true;
    } catch (_) {
      await _storage.deleteAll();   // Force re-login
      return false;
    }
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? params}) async {
    final res = await _dio.get(path, queryParameters: params);
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> post(String path, {dynamic data}) async {
    final res = await _dio.post(path, data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> patch(String path, {dynamic data}) async {
    final res = await _dio.patch(path, data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final res = await _dio.delete(path);
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> uploadFile(String path, String filePath, String fieldName) async {
    final formData = FormData.fromMap({
      fieldName: await MultipartFile.fromFile(filePath),
    });
    final res = await _dio.post(path, data: formData);
    return res.data as Map<String, dynamic>;
  }
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
```

---

## 3. Auth Flow

```dart
// lib/features/auth/auth_repository.dart

class AuthRepository {
  final ApiClient _api;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<void> login(String email, String password) async {
    final res = await _api.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    await _storage.write(key: 'access_token', value: res['data']['accessToken']);
    await _storage.write(key: 'refresh_token', value: res['data']['refreshToken']);
  }

  Future<void> logout() async {
    await _api.post('/auth/logout');
    await _storage.deleteAll();
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'access_token');
    return token != null;
  }
}
```

---

## 4. Socket.io Real-time Client

```dart
// lib/core/network/socket_client.dart

import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SocketClient {
  static const _socketUrl = String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: 'https://api.platform.com',
  );

  IO.Socket? _socket;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<void> connect() async {
    final token = await _storage.read(key: 'access_token');
    _socket = IO.io(_socketUrl, IO.OptionBuilder()
      .setTransports(['websocket'])
      .setAuth({'token': token})
      .enableAutoConnect()
      .enableReconnection()
      .build());

    _socket!.onConnect((_) => debugPrint('✅ Socket connected'));
    _socket!.onDisconnect((_) => debugPrint('🔴 Socket disconnected'));
    _socket!.onConnectError((err) => debugPrint('Socket error: $err'));
  }

  void disconnect() => _socket?.disconnect();

  // ── BUYER: Join order tracking room ──
  void trackOrder(String orderId) {
    _socket?.emit('track:join', orderId);
  }

  void onDeliveryLocationUpdate(void Function(Map<String, dynamic>) callback) {
    _socket?.on('delivery:location_broadcast', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void onDeliveryStatusChanged(void Function(Map<String, dynamic>) callback) {
    _socket?.on('delivery:status_changed', (data) => callback(Map<String, dynamic>.from(data)));
  }

  // ── DELIVERY APP: Stream GPS to server ──
  void streamLocation({
    required String deliveryTaskId,
    required double lat,
    required double lng,
  }) {
    _socket?.emit('delivery:location_update', {
      'deliveryTaskId': deliveryTaskId,
      'lat': lat,
      'lng': lng,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  // ── DELIVERY APP: Listen for new assignments ──
  void onNewAssignment(void Function(Map<String, dynamic>) callback) {
    _socket?.on('delivery:new_assignment', (data) => callback(Map<String, dynamic>.from(data)));
  }
}

final socketClientProvider = Provider<SocketClient>((ref) => SocketClient());
```

---

## 5. FCM Push Notifications

```dart
// lib/core/notifications/fcm_service.dart
// Call setupFCM() once in main() after Firebase.initializeApp()

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class FCMService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotif = FlutterLocalNotificationsPlugin();

  Future<void> setup(ApiClient api) async {
    await _fcm.requestPermission();

    // Register token with backend
    final token = await _fcm.getToken();
    if (token != null) {
      await api.patch('/users/me/fcm-token', data: {'fcmToken': token});
    }

    // Refresh token listener
    _fcm.onTokenRefresh.listen((newToken) {
      api.patch('/users/me/fcm-token', data: {'fcmToken': newToken});
    });

    // Foreground notifications
    FirebaseMessaging.onMessage.listen((message) {
      _showLocalNotification(message);
    });
  }

  void _showLocalNotification(RemoteMessage message) {
    _localNotif.show(
      0,
      message.notification?.title ?? '',
      message.notification?.body ?? '',
      const NotificationDetails(
        android: AndroidNotificationDetails('orders', 'Order Updates'),
        iOS: DarwinNotificationDetails(),
      ),
    );
  }
}
```

---

## 6. Buyer App — Screen → API Map

| Screen | API Calls |
|--------|-----------|
| **Home / Browse** | `GET /products?page=1&page_size=20` |
| **Search** | `GET /search/products?q=...&category=...&min_price=...` |
| **Product Detail** | `GET /products/:id`, `GET /products/:id/variants`, `GET /products/:id/reviews` |
| **Cart** | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id` |
| **Checkout** | `GET /referrals/wallet` (credits), `POST /orders/checkout` |
| **Order Tracking** | `GET /delivery/track/:orderId` + Socket.io `track:join` |
| **Live Map** | `onDeliveryLocationUpdate` socket event → update `GoogleMap` marker |
| **Order History** | `GET /orders` |
| **Order Detail** | `GET /orders/:id` |
| **Write Review** | `POST /products/:id/reviews` + image upload |
| **Referral Dashboard** | `GET /referrals/my-code`, `GET /referrals/wallet` |
| **Profile** | `GET /users/me`, `PATCH /users/me` |
| **Addresses** | `GET /users/me/addresses`, `POST /users/me/addresses` |
| **Storefront Browse** | `GET /store/:seller-slug` (static CDN page) |

---

## 7. Seller App — Screen → API Map

| Screen | API Calls |
|--------|-----------|
| **Dashboard** | `GET /seller/dashboard` |
| **Products List** | `GET /seller/products` |
| **Add / Edit Product** | `POST /seller/products`, `PUT /seller/products/:id` |
| **Inventory** | `PATCH /seller/products/:id/inventory` |
| **Orders** | `GET /seller/orders` |
| **Order Detail** | `PATCH /seller/orders/:id/status`, `POST /seller/orders/:id/tracking` |
| **Analytics** | `GET /seller/analytics/revenue`, `GET /seller/analytics/products` |
| **Storefront Designer** | `GET /storefront/design`, `PUT /storefront/design`, `POST /storefront/design/publish` |
| **Profile / Settings** | `GET /users/me`, `PATCH /users/me` |

---

## 8. Admin App — Screen → API Map

| Screen | API Calls |
|--------|-----------|
| **Dashboard** | `GET /admin/analytics` |
| **Users** | `GET /admin/users`, `PATCH /admin/users/:id/status` |
| **Sellers** | `GET /sellers`, `PATCH /sellers/:id/status` |
| **Products Moderation** | `GET /admin/products`, `PATCH /admin/products/:id/approve` |
| **Orders** | `GET /admin/orders` (cross-service aggregated) |
| **Deliveries** | `GET /admin/delivery/tasks`, `POST /admin/delivery/tasks/:id/reassign` |
| **Delivery Agents** | `GET /admin/delivery/agents`, `PATCH /admin/delivery/agents/:id/verify` |
| **Payouts** | `GET /admin/delivery/earnings`, `POST /admin/delivery/earnings/payout` |
| **Referrals** | `GET /admin/referrals`, `PATCH /admin/referrals/:id/revoke` |
| **Config** | `GET /admin/referral-config`, `PATCH /admin/referral-config/:key` |
| **Coupons** | `POST /admin/coupons` |

---

## 9. Delivery App — Screen → API Map

| Screen | API Calls + Sockets |
|--------|---------------------|
| **Login** | `POST /delivery/auth/login` |
| **Home (toggle online)** | `PATCH /delivery/me/status`, `GET /delivery/me` |
| **Active Delivery** | `GET /delivery/tasks/active`, Socket `onNewAssignment` |
| **Mark Picked Up** | `POST /delivery/tasks/:id/pickup` |
| **Mark Delivered** | `POST /delivery/tasks/:id/deliver` + upload photo |
| **Mark Failed** | `POST /delivery/tasks/:id/fail` |
| **GPS Streaming** | Socket `streamLocation` (every 5s, background service) |
| **Earnings** | `GET /delivery/me/earnings` |
| **History** | `GET /delivery/me/history` |
| **Profile** | `GET /delivery/me`, `PATCH /delivery/me` |

---

## 10. Error Handling Pattern

```dart
// lib/core/network/api_exception.dart

class ApiException implements Exception {
  final String message;
  final String code;
  final int statusCode;

  const ApiException({required this.message, required this.code, required this.statusCode});

  @override
  String toString() => 'ApiException[$statusCode/$code]: $message';
}

// In every repository method, wrap API calls:
Future<Product> getProduct(String id) async {
  try {
    final res = await _api.get('/products/$id');
    return Product.fromJson(res['data']);
  } on DioException catch (e) {
    final data = e.response?.data as Map<String, dynamic>?;
    throw ApiException(
      message: data?['error'] ?? 'Unknown error',
      code: data?['code'] ?? 'UNKNOWN',
      statusCode: e.response?.statusCode ?? 0,
    );
  }
}

// In UI (Riverpod AsyncValue):
ref.watch(productProvider(id)).when(
  data: (product) => ProductDetailWidget(product: product),
  loading: () => const ShimmerLoader(),
  error: (e, _) => ErrorWidget(e is ApiException ? e.message : 'Something went wrong'),
);
```

---

## 11. Offline Support Pattern

```dart
// For critical data (cart, active order), cache locally with Hive:

final cartBox = await Hive.openBox<CartItem>('cart');

// On API success → write to Hive
final cartItems = await _api.get('/cart');
await cartBox.clear();
for (final item in cartItems['data']) {
  await cartBox.put(item['id'], CartItem.fromJson(item));
}

// On load → show Hive data immediately, then refresh from API
final localCart = cartBox.values.toList();   // Show instantly
final freshCart = await _api.get('/cart');    // Then update
```
