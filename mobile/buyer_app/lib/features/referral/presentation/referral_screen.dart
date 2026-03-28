import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';

final referralProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/referrals/my');
  return res.data['data'] as Map<String, dynamic>? ?? {};
});

class ReferralScreen extends ConsumerWidget {
  const ReferralScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final referral = ref.watch(referralProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Referral & Rewards')),
      body: referral.when(
        data: (data) {
          final code = data['code'] as String? ?? '------';
          final totalReferrals = data['totalReferrals'] as int? ?? 0;
          final totalEarned = (data['totalEarned'] ?? 0).toDouble();
          final pendingBalance = (data['pendingBalance'] ?? 0).toDouble();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(children: [
              // Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFFF97316), Color(0xFFEF4444)]),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(children: [
                  const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 48),
                  const SizedBox(height: 12),
                  const Text('Invite Friends, Earn Rewards!', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  const Text('Earn Rs 200 for every friend who registers and places their first order', style: TextStyle(color: Colors.white70, fontSize: 13, textAlign: TextAlign.center)),
                ]),
              ),
              const SizedBox(height: 24),

              // Code box
              const Text('Your Referral Code', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFF97316), width: 2),
                ),
                child: Row(children: [
                  Expanded(
                    child: Text(code, textAlign: TextAlign.center, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFFF97316), letterSpacing: 4)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy_rounded, color: Color(0xFFF97316)),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: code));
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Code copied!')));
                    },
                  ),
                ]),
              ),
              const SizedBox(height: 20),

              ElevatedButton.icon(
                icon: const Icon(Icons.share_rounded),
                label: const Text('Share with Friends'),
                onPressed: () {
                  // Share functionality
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                ),
              ),
              const SizedBox(height: 24),

              // Stats
              Row(children: [
                Expanded(child: _StatCard(value: '$totalReferrals', label: 'Friends Invited', icon: Icons.people_outline_rounded)),
                const SizedBox(width: 12),
                Expanded(child: _StatCard(value: 'Rs ${totalEarned.toStringAsFixed(0)}', label: 'Total Earned', icon: Icons.savings_outlined)),
                const SizedBox(width: 12),
                Expanded(child: _StatCard(value: 'Rs ${pendingBalance.toStringAsFixed(0)}', label: 'Available', icon: Icons.account_balance_wallet_outlined)),
              ]),

              const SizedBox(height: 24),
              const Text('How it works', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 12),
              _HowStep(step: '1', text: 'Share your referral code with friends'),
              _HowStep(step: '2', text: 'Friend registers using your code'),
              _HowStep(step: '3', text: 'Friend places their first order'),
              _HowStep(step: '4', text: 'You both earn Rs 200 reward!'),
            ]),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.value, required this.label, required this.icon});
  final String value, label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFF3F4F6)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(children: [
        Icon(icon, color: const Color(0xFFF97316), size: 24),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 10), textAlign: TextAlign.center),
      ]),
    );
  }
}

class _HowStep extends StatelessWidget {
  const _HowStep({required this.step, required this.text});
  final String step, text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Container(
          width: 28, height: 28,
          decoration: const BoxDecoration(color: Color(0xFFF97316), shape: BoxShape.circle),
          child: Center(child: Text(step, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13))),
        ),
        const SizedBox(width: 12),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 14))),
      ]),
    );
  }
}
