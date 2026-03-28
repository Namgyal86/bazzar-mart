import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

final pendingDeliveriesProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/delivery/agent/orders', queryParameters: {'status': 'ASSIGNED'});
  return res.data['data'] as List? ?? [];
});

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _isOnline = true;

  Future<void> _toggleOnline() async {
    final newStatus = !_isOnline;
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/api/v1/delivery/agent/status', data: {'isOnline': newStatus});
      setState(() => _isOnline = newStatus);
    } catch (_) {
      setState(() => _isOnline = newStatus);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider).value;
    final deliveries = ref.watch(pendingDeliveriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Hi, ${auth?.firstName ?? 'Agent'}!'),
        actions: [
          IconButton(icon: const Icon(Icons.history_rounded), onPressed: () => context.go('/history')),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Online toggle
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: _isOnline ? [const Color(0xFF059669), const Color(0xFF10B981)] : [const Color(0xFF6B7280), const Color(0xFF9CA3AF)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_isOnline ? 'You are Online' : 'You are Offline', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                Text(_isOnline ? 'Ready to accept deliveries' : 'Go online to receive orders', style: const TextStyle(color: Colors.white70, fontSize: 13)),
              ]),
              const Spacer(),
              Switch(
                value: _isOnline,
                onChanged: (_) => _toggleOnline(),
                activeColor: Colors.white,
                activeTrackColor: Colors.white.withOpacity(0.4),
              ),
            ]),
          ),
          const SizedBox(height: 24),

          // Assigned deliveries
          const Align(alignment: Alignment.centerLeft, child: Text('Pending Deliveries', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700))),
          const SizedBox(height: 12),
          deliveries.when(
            data: (data) => data.isEmpty
                ? Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(16)),
                    child: const Column(children: [
                      Icon(Icons.check_circle_outline_rounded, size: 48, color: Colors.grey),
                      SizedBox(height: 12),
                      Text('No pending deliveries', style: TextStyle(color: Colors.grey)),
                    ]),
                  )
                : Column(children: data.map((d) => _DeliveryCard(delivery: d)).toList()),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Error: $e')),
          ),
        ]),
      ),
    );
  }
}

class _DeliveryCard extends StatelessWidget {
  const _DeliveryCard({required this.delivery});
  final dynamic delivery;

  @override
  Widget build(BuildContext context) {
    final orderId = delivery['_id'] as String? ?? delivery['orderId'] as String? ?? '';
    final address = delivery['shippingAddress'] as Map<String, dynamic>?;
    final total = (delivery['total'] ?? delivery['totalAmount'] ?? 0).toDouble();

    return GestureDetector(
      onTap: () => context.go('/delivery/$orderId'),
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.location_on_rounded, color: Color(0xFF2563EB), size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(
                address != null ? '${address['street'] ?? ''}, ${address['city'] ?? ''}' : 'Address not available',
                style: const TextStyle(fontWeight: FontWeight.w600),
              )),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              Text('#${orderId.length > 8 ? orderId.substring(orderId.length - 8) : orderId}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
              const Spacer(),
              Text('Rs ${total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
            ]),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => context.go('/delivery/$orderId'),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 10)),
                child: const Text('Start Delivery'),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
