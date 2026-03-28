import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthState {
  final bool isAuthenticated;
  final String? userId;
  final String? role;
  final String? firstName;
  final String? lastName;
  final String? email;
  final String? referralCode;

  const AuthState({
    this.isAuthenticated = false,
    this.userId,
    this.role,
    this.firstName,
    this.lastName,
    this.email,
    this.referralCode,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    String? userId,
    String? role,
    String? firstName,
    String? lastName,
    String? email,
    String? referralCode,
  }) => AuthState(
    isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    userId:       userId       ?? this.userId,
    role:         role         ?? this.role,
    firstName:    firstName    ?? this.firstName,
    lastName:     lastName     ?? this.lastName,
    email:        email        ?? this.email,
    referralCode: referralCode ?? this.referralCode,
  );
}

class AuthNotifier extends AsyncNotifier<AuthState> {
  final _storage = const FlutterSecureStorage();

  @override
  Future<AuthState> build() async {
    final token        = await _storage.read(key: 'access_token');
    final userId       = await _storage.read(key: 'user_id');
    final role         = await _storage.read(key: 'user_role');
    final firstName    = await _storage.read(key: 'user_first_name');
    final lastName     = await _storage.read(key: 'user_last_name');
    final email        = await _storage.read(key: 'user_email');
    final referralCode = await _storage.read(key: 'user_referral_code');

    if (token != null && userId != null) {
      return AuthState(
        isAuthenticated: true,
        userId: userId,
        role: role,
        firstName: firstName,
        lastName: lastName,
        email: email,
        referralCode: referralCode,
      );
    }
    return const AuthState();
  }

  Future<void> login({
    required String accessToken,
    required String refreshToken,
    required String userId,
    required String role,
    required String firstName,
    String? lastName,
    required String email,
    String? referralCode,
  }) async {
    await _storage.write(key: 'access_token',       value: accessToken);
    await _storage.write(key: 'refresh_token',      value: refreshToken);
    await _storage.write(key: 'user_id',            value: userId);
    await _storage.write(key: 'user_role',          value: role);
    await _storage.write(key: 'user_first_name',    value: firstName);
    await _storage.write(key: 'user_last_name',     value: lastName ?? '');
    await _storage.write(key: 'user_email',         value: email);
    await _storage.write(key: 'user_referral_code', value: referralCode ?? '');
    state = AsyncData(AuthState(
      isAuthenticated: true,
      userId:       userId,
      role:         role,
      firstName:    firstName,
      lastName:     lastName,
      email:        email,
      referralCode: referralCode,
    ));
  }

  Future<void> logout() async {
    await _storage.deleteAll();
    state = const AsyncData(AuthState());
  }
}

final authStateProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
