import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider).value;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: Column(children: [
        ListTile(
          leading: CircleAvatar(
            backgroundColor: const Color(0xFFF3F4F6),
            child: Text(auth?.firstName?[0] ?? 'A', style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          title: Text(auth?.firstName ?? 'Admin', style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text(auth?.email ?? '', style: const TextStyle(fontSize: 12)),
        ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.category_outlined),
          title: const Text('Category Management'),
          onTap: () {},
          trailing: const Icon(Icons.chevron_right_rounded),
        ),
        ListTile(
          leading: const Icon(Icons.local_offer_outlined),
          title: const Text('Promo Codes'),
          onTap: () {},
          trailing: const Icon(Icons.chevron_right_rounded),
        ),
        ListTile(
          leading: const Icon(Icons.notifications_outlined),
          title: const Text('Push Notifications'),
          onTap: () {},
          trailing: const Icon(Icons.chevron_right_rounded),
        ),
        ListTile(
          leading: const Icon(Icons.settings_outlined),
          title: const Text('Platform Config'),
          onTap: () {},
          trailing: const Icon(Icons.chevron_right_rounded),
        ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.logout_rounded, color: Colors.red),
          title: const Text('Sign Out', style: TextStyle(color: Colors.red)),
          onTap: () async {
            await ref.read(authStateProvider.notifier).logout();
            if (context.mounted) context.go('/auth/login');
          },
        ),
      ]),
    );
  }
}
