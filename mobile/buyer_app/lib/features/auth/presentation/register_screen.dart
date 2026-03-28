import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey  = GlobalKey<FormState>();
  final _firstCtrl = TextEditingController();
  final _lastCtrl  = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();
  final _refCtrl   = TextEditingController();
  bool _loading = false;
  bool _obscure = true;

  @override
  void dispose() {
    _firstCtrl.dispose(); _lastCtrl.dispose();
    _emailCtrl.dispose(); _phoneCtrl.dispose();
    _passCtrl.dispose();  _refCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/api/v1/auth/register', data: {
        'firstName':    _firstCtrl.text.trim(),
        'lastName':     _lastCtrl.text.trim(),
        'email':        _emailCtrl.text.trim(),
        'phone':        _phoneCtrl.text.trim(),
        'password':     _passCtrl.text,
        'role':         'BUYER',
        if (_refCtrl.text.isNotEmpty) 'referralCode': _refCtrl.text.trim(),
      });
      final data = res.data['data'];
      await ref.read(authStateProvider.notifier).login(
        accessToken:  data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
        userId:       (data['user']['id'] ?? data['user']['_id']) as String,
        role:         data['user']['role'] as String,
        firstName:    data['user']['firstName'] as String,
        lastName:     data['user']['lastName'] as String?,
        email:        data['user']['email'] as String,
        referralCode: data['user']['referralCode'] as String?,
      );
      if (mounted) context.go('/home');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Registration failed. ${e.toString()}'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(leading: const BackButton()),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Create account', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Join Bazzar and start shopping', style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey)),
                const SizedBox(height: 28),

                Row(children: [
                  Expanded(child: TextFormField(controller: _firstCtrl, decoration: const InputDecoration(labelText: 'First name'), validator: (v) => v!.isEmpty ? 'Required' : null)),
                  const SizedBox(width: 12),
                  Expanded(child: TextFormField(controller: _lastCtrl,  decoration: const InputDecoration(labelText: 'Last name'),  validator: (v) => v!.isEmpty ? 'Required' : null)),
                ]),
                const SizedBox(height: 14),
                TextFormField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(prefixIcon: Icon(Icons.email_outlined), labelText: 'Email'), validator: (v) => v!.contains('@') ? null : 'Invalid email'),
                const SizedBox(height: 14),
                TextFormField(controller: _phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(prefixIcon: Icon(Icons.phone_outlined), labelText: 'Phone (98XXXXXXXX)'), validator: (v) => v!.length >= 10 ? null : 'Enter valid phone'),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _passCtrl,
                  obscureText: _obscure,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.lock_outline),
                    labelText: 'Password',
                    suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined), onPressed: () => setState(() => _obscure = !_obscure)),
                  ),
                  validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Min 6 characters',
                ),
                const SizedBox(height: 14),
                TextFormField(controller: _refCtrl, decoration: const InputDecoration(prefixIcon: Icon(Icons.card_giftcard_outlined), labelText: 'Referral code (optional)')),
                const SizedBox(height: 28),

                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _register,
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Create Account'),
                  ),
                ),
                const SizedBox(height: 20),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Text('Already have an account? '),
                  TextButton(onPressed: () => context.go('/auth/login'), child: const Text('Sign in')),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
