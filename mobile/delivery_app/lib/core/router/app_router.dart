import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/delivery/presentation/delivery_screen.dart';
import '../../features/history/presentation/history_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/home',
    redirect: (context, state) {
      final isAuth = authState.value?.isAuthenticated == true;
      final isLoginPage = state.matchedLocation == '/auth/login';
      if (!isAuth && !isLoginPage) return '/auth/login';
      if (isAuth && isLoginPage) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/auth/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/delivery/:orderId', builder: (_, s) => DeliveryScreen(orderId: s.pathParameters['orderId']!)),
      GoRoute(path: '/history', builder: (_, __) => const HistoryScreen()),
    ],
  );
});
