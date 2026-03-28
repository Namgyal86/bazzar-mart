import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider).value;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: SingleChildScrollView(
        child: Column(children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFFF97316), Color(0xFFEF4444)])),
            child: Column(children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: Colors.white,
                child: Text((auth?.firstName ?? 'S')[0], style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: Color(0xFFF97316))),
              ),
              const SizedBox(height: 12),
              Text(auth?.shopName ?? auth?.firstName ?? 'Seller', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
              Text(auth?.email ?? '', style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ]),
          ),
          ListTile(leading: const Icon(Icons.store_outlined), title: const Text('Shop Settings'), onTap: () {}, trailing: const Icon(Icons.chevron_right_rounded)),
          ListTile(leading: const Icon(Icons.account_balance_outlined), title: const Text('Bank Account'), onTap: () {}, trailing: const Icon(Icons.chevron_right_rounded)),
          ListTile(leading: const Icon(Icons.help_outline_rounded), title: const Text('Help & Support'), onTap: () {}, trailing: const Icon(Icons.chevron_right_rounded)),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Colors.red),
            title: const Text('Sign Out', style: TextStyle(color: Colors.red)),
            onTap: () async {
              await ref.read(authStateProvider.notifier).logout();
              if (context.mounted) context.go('/auth/login');
            },
          ),
        ]),
      ),
    );
  }
}
