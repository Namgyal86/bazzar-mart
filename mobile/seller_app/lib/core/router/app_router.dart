import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/main/presentation/main_scaffold.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/products/presentation/products_screen.dart';
import '../../features/products/presentation/add_product_screen.dart';
import '../../features/orders/presentation/orders_screen.dart';
import '../../features/orders/presentation/order_detail_screen.dart';
import '../../features/analytics/presentation/analytics_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isAuth = authState.value?.isAuthenticated == true;
      final isLoginPage = state.matchedLocation.startsWith('/auth');
      if (!isAuth && !isLoginPage) return '/auth/login';
      if (isAuth && isLoginPage) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/auth/login', builder: (_, __) => const LoginScreen()),
      ShellRoute(
        builder: (_, __, child) => MainScaffold(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
          GoRoute(
            path: '/products',
            builder: (_, __) => const ProductsScreen(),
            routes: [
              GoRoute(path: 'add', builder: (_, __) => const AddProductScreen()),
              GoRoute(path: ':id/edit', builder: (_, s) => AddProductScreen(productId: s.pathParameters['id'])),
            ],
          ),
          GoRoute(
            path: '/orders',
            builder: (_, __) => const SellerOrdersScreen(),
            routes: [
              GoRoute(path: ':id', builder: (_, s) => SellerOrderDetailScreen(orderId: s.pathParameters['id']!)),
            ],
          ),
          GoRoute(path: '/analytics', builder: (_, __) => const AnalyticsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
    ],
  );
});
