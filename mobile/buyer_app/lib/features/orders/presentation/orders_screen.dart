import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

final ordersProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/orders/my');
  return res.data['data'] as List? ?? [];
});

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider).value;
    if (auth?.isAuthenticated != true) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Orders')),
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Sign in to view orders'),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: () => context.go('/auth/login'), child: const Text('Sign In')),
          ]),
        ),
      );
    }

    final orders = ref.watch(ordersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: orders.when(
        data: (data) => data.isEmpty
            ? Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.receipt_long_outlined, size: 80, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No orders yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 24),
                  ElevatedButton(onPressed: () => context.go('/products'), child: const Text('Start Shopping')),
                ]),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: data.length,
                itemBuilder: (_, i) => _OrderCard(order: data[i]),
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});
  final dynamic order;

  Color _statusColor(String s) {
    switch (s) {
      case 'DELIVERED': return const Color(0xFF059669);
      case 'CANCELLED': return const Color(0xFFDC2626);
      case 'IN_TRANSIT': return const Color(0xFF2563EB);
      default: return const Color(0xFFF59E0B);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = order['status'] as String? ?? 'PENDING';
    final orderId = order['_id'] as String? ?? '';
    final items = (order['items'] as List?) ?? [];
    final total = (order['total'] ?? order['totalAmount'] ?? 0).toDouble();
    final date = order['createdAt'] as String?;

    return GestureDetector(
      onTap: () => context.go('/orders/$orderId'),
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(
                child: Text('#${orderId.length > 8 ? orderId.substring(orderId.length - 8) : orderId}',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor(status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(status.replaceAll('_', ' '), style: TextStyle(color: _statusColor(status), fontWeight: FontWeight.w600, fontSize: 12)),
              ),
            ]),
            const SizedBox(height: 8),
            Text('${items.length} item${items.length != 1 ? 's' : ''}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
            if (date != null)
              Text(date.substring(0, 10), style: const TextStyle(color: Colors.grey, fontSize: 12)),
            const Divider(height: 20),
            Row(children: [
              const Expanded(child: Text('Total', style: TextStyle(fontWeight: FontWeight.w600))),
              Text('Rs ${total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFF97316), fontSize: 16)),
              const SizedBox(width: 8),
              if (status == 'IN_TRANSIT')
                TextButton(
                  onPressed: () => context.go('/orders/$orderId/track'),
                  child: const Text('Track'),
                ),
            ]),
          ]),
        ),
      ),
    );
  }
}
