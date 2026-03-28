import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthState {
  const AuthState({this.isAuthenticated = false, this.userId, this.role, this.firstName, this.email, this.shopName});
  final bool isAuthenticated;
  final String? userId, role, firstName, email, shopName;
}

class AuthNotifier extends AsyncNotifier<AuthState> {
  final _storage = const FlutterSecureStorage();

  @override
  Future<AuthState> build() async {
    final token = await _storage.read(key: 'access_token');
    if (token == null) return const AuthState();
    return AuthState(
      isAuthenticated: true,
      userId: await _storage.read(key: 'user_id'),
      role: await _storage.read(key: 'user_role'),
      firstName: await _storage.read(key: 'first_name'),
      email: await _storage.read(key: 'email'),
      shopName: await _storage.read(key: 'shop_name'),
    );
  }

  Future<void> login({required String accessToken, required String refreshToken, required String userId, required String role, String? firstName, String? email, String? shopName}) async {
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
    await _storage.write(key: 'user_id', value: userId);
    await _storage.write(key: 'user_role', value: role);
    if (firstName != null) await _storage.write(key: 'first_name', value: firstName);
    if (email != null) await _storage.write(key: 'email', value: email);
    if (shopName != null) await _storage.write(key: 'shop_name', value: shopName);
    state = AsyncValue.data(AuthState(isAuthenticated: true, userId: userId, role: role, firstName: firstName, email: email, shopName: shopName));
  }

  Future<void> logout() async {
    await _storage.deleteAll();
    state = const AsyncValue.data(AuthState());
  }
}

final authStateProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
