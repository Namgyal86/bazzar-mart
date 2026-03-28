import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthState {
  const AuthState({this.isAuthenticated = false, this.userId, this.agentId, this.firstName, this.email});
  final bool isAuthenticated;
  final String? userId, agentId, firstName, email;
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
      agentId: await _storage.read(key: 'agent_id'),
      firstName: await _storage.read(key: 'first_name'),
      email: await _storage.read(key: 'email'),
    );
  }

  Future<void> login({required String accessToken, required String refreshToken, required String userId, String? agentId, String? firstName, String? email}) async {
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
    await _storage.write(key: 'user_id', value: userId);
    if (agentId != null) await _storage.write(key: 'agent_id', value: agentId);
    if (firstName != null) await _storage.write(key: 'first_name', value: firstName);
    if (email != null) await _storage.write(key: 'email', value: email);
    state = AsyncValue.data(AuthState(isAuthenticated: true, userId: userId, agentId: agentId, firstName: firstName, email: email));
  }

  Future<void> logout() async {
    await _storage.deleteAll();
    state = const AsyncValue.data(AuthState());
  }
}

final authStateProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
