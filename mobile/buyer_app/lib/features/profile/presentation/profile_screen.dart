import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider).value;

    if (auth?.isAuthenticated != true) {
      return Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.person_outline_rounded, size: 80, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Sign in to your account', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            const Text('Manage orders, addresses and more', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/auth/login'),
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 14)),
              child: const Text('Sign In'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => context.go('/auth/register'),
              child: const Text('Create Account'),
            ),
          ]),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: SingleChildScrollView(
        child: Column(children: [
          // Avatar section
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [Color(0xFFF97316), Color(0xFFEF4444)]),
            ),
            child: Column(children: [
              CircleAvatar(
                radius: 40,
                backgroundColor: Colors.white,
                child: Text(
                  (auth!.firstName ?? 'U')[0].toUpperCase(),
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFFF97316)),
                ),
              ),
              const SizedBox(height: 12),
              Text(auth.firstName ?? 'User', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
              Text(auth.email ?? '', style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ]),
          ),

          const SizedBox(height: 8),
          _Section(title: 'My Account', items: [
            _ProfileItem(icon: Icons.receipt_long_outlined, title: 'My Orders', onTap: () => context.go('/orders')),
            _ProfileItem(icon: Icons.location_on_outlined, title: 'Addresses', onTap: () => context.go('/profile/addresses')),
            _ProfileItem(icon: Icons.favorite_border_rounded, title: 'Wishlist', onTap: () => context.go('/wishlist')),
            _ProfileItem(icon: Icons.card_giftcard_outlined, title: 'Referral & Rewards', onTap: () => context.go('/referral')),
          ]),

          const SizedBox(height: 8),
          _Section(title: 'Preferences', items: [
            _ProfileItem(icon: Icons.notifications_none_rounded, title: 'Notifications', onTap: () => context.go('/profile/notifications')),
            _ProfileItem(icon: Icons.language_outlined, title: 'Language', onTap: () {}),
            _ProfileItem(icon: Icons.help_outline_rounded, title: 'Help & Support', onTap: () {}),
          ]),

          const SizedBox(height: 8),
          _Section(items: [
            _ProfileItem(
              icon: Icons.logout_rounded,
              title: 'Sign Out',
              color: Colors.red,
              onTap: () async {
                await ref.read(authStateProvider.notifier).logout();
                if (context.mounted) context.go('/home');
              },
            ),
          ]),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({this.title, required this.items});
  final String? title;
  final List<Widget> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).cardColor,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (title != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(title!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey)),
          ),
        ...items,
      ]),
    );
  }
}

class _ProfileItem extends StatelessWidget {
  const _ProfileItem({required this.icon, required this.title, required this.onTap, this.color});
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(title, style: TextStyle(color: color, fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.chevron_right_rounded, color: Colors.grey),
      onTap: onTap,
    );
  }
}
