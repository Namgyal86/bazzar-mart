import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/api/v1/auth/login', data: {
        'email': _emailCtrl.text.trim(),
        'password': _passCtrl.text,
      });
      final data = res.data['data'];
      await ref.read(authStateProvider.notifier).login(
        accessToken:  data['accessToken'],
        refreshToken: data['refreshToken'],
        userId:       data['user']['_id'],
        role:         data['user']['role'],
        firstName:    data['user']['firstName'],
        email:        data['user']['email'],
      );
      if (mounted) context.go('/home');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_errorMessage(e)), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _errorMessage(Object e) {
    if (e.toString().contains('401') || e.toString().contains('Invalid')) {
      return 'Invalid email or password.';
    }
    return 'Login failed. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 24),
                // Logo
                Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFFF97316), Color(0xFFEF4444)]),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.shopping_bag_rounded, color: Colors.white, size: 36),
                  ),
                ),
                const SizedBox(height: 20),
                Text('Welcome back!', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700), textAlign: TextAlign.center),
                const SizedBox(height: 6),
                Text('Sign in to continue shopping', style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey), textAlign: TextAlign.center),
                const SizedBox(height: 40),

                // Email
                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(prefixIcon: Icon(Icons.email_outlined), labelText: 'Email'),
                  validator: (v) => v != null && v.contains('@') ? null : 'Enter a valid email',
                ),
                const SizedBox(height: 16),

                // Password
                TextFormField(
                  controller: _passCtrl,
                  obscureText: _obscure,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.lock_outline),
                    labelText: 'Password',
                    suffixIcon: IconButton(
                      icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Password must be at least 6 characters',
                ),
                const SizedBox(height: 8),

                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {},
                    child: const Text('Forgot password?'),
                  ),
                ),
                const SizedBox(height: 16),

                // Login button
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _login,
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Sign In'),
                  ),
                ),
                const SizedBox(height: 24),

                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Text("Don't have an account? "),
                  TextButton(
                    onPressed: () => context.go('/auth/register'),
                    child: const Text('Sign up'),
                  ),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
