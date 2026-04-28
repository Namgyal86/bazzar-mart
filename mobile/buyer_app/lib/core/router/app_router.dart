import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/products/presentation/product_list_screen.dart';
import '../../features/products/presentation/product_detail_screen.dart';
import '../../features/cart/presentation/cart_screen.dart';
import '../../features/checkout/presentation/checkout_screen.dart';
import '../../features/orders/presentation/orders_screen.dart';
import '../../features/orders/presentation/order_detail_screen.dart';
import '../../features/orders/presentation/order_tracking_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/profile/presentation/addresses_screen.dart';
import '../../features/profile/presentation/notifications_screen.dart';
import '../../features/referral/presentation/referral_screen.dart';
import '../../features/wishlist/presentation/wishlist_screen.dart';
import '../../features/search/presentation/search_screen.dart';
import '../../features/main/presentation/main_scaffold.dart';
import '../providers/auth_provider.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/home',
    redirect: (context, state) {
      final isAuthenticated = authState.value?.isAuthenticated ?? false;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      if (!isAuthenticated && !isAuthRoute) {
        final protectedRoutes = ['/cart', '/checkout', '/orders', '/profile', '/referral'];
        if (protectedRoutes.any((r) => state.matchedLocation.startsWith(r))) {
          return '/auth/login?redirect=${Uri.encodeComponent(state.matchedLocation)}';
        }
      }
      if (isAuthenticated && isAuthRoute) return '/home';
      return null;
    },
    routes: [
      // Auth
      GoRoute(path: '/auth/login',    builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/auth/register', builder: (_, __) => const RegisterScreen()),

      // Main scaffold (bottom nav)
      ShellRoute(
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          GoRoute(path: '/home',     builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/search',   builder: (_, state) => SearchScreen(query: state.uri.queryParameters['q'] ?? '')),
          GoRoute(path: '/wishlist', builder: (_, __) => const WishlistScreen()),
          GoRoute(path: '/profile',  builder: (_, __) => const ProfileScreen()),
        ],
      ),

      // Products
      GoRoute(
        path: '/products',
        builder: (_, state) => ProductListScreen(
          category: state.uri.queryParameters['category'],
          query: state.uri.queryParameters['q'],
        ),
        routes: [
          GoRoute(
            path: ':id',
            builder: (_, state) => ProductDetailScreen(productId: state.pathParameters['id']!),
          ),
        ],
      ),

      // Cart
      GoRoute(path: '/cart', builder: (_, __) => const CartScreen()),

      // Checkout
      GoRoute(path: '/checkout', builder: (_, __) => const CheckoutScreen()),

      // Orders
      GoRoute(
        path: '/orders',
        builder: (_, __) => const OrdersScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (_, state) => OrderDetailScreen(orderId: state.pathParameters['id']!),
            routes: [
              GoRoute(
                path: 'track',
                builder: (_, state) => OrderTrackingScreen(orderId: state.pathParameters['id']!),
              ),
            ],
          ),
        ],
      ),

      // Profile sub-routes
      // Profile sub-routes — accessible via /profile/... and bare /... aliases
      GoRoute(path: '/profile/addresses',    builder: (_, __) => const AddressesScreen()),
      GoRoute(path: '/profile/notifications',builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/addresses',            builder: (_, __) => const AddressesScreen()),
      GoRoute(path: '/notifications',        builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/referral',             builder: (_, __) => const ReferralScreen()),
    ],
  );
});
