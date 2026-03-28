import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000'); // Android emulator localhost

final apiClientProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 20),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.interceptors.add(_AuthInterceptor(ref));
  dio.interceptors.add(LogInterceptor(requestBody: true, responseBody: true));
  return dio;
});

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._ref);
  final Ref _ref;
  final _storage = const FlutterSecureStorage();

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.read(key: 'access_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try refresh
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken != null) {
        try {
          final dio = Dio(BaseOptions(baseUrl: _baseUrl));
          final res = await dio.post('/api/v1/auth/refresh', data: {'refreshToken': refreshToken});
          final newToken = res.data['data']['accessToken'];
          await _storage.write(key: 'access_token', value: newToken);
          err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
          final retry = await Dio().fetch(err.requestOptions);
          return handler.resolve(retry);
        } catch (_) {
          await _storage.deleteAll();
        }
      }
    }
    handler.next(err);
  }
}
