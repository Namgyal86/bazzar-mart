import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';

final sellerOrderDetailProvider = FutureProvider.family<dynamic, String>((ref, id) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/seller/orders/$id');
  return res.data['data'];
});

class SellerOrderDetailScreen extends ConsumerStatefulWidget {
  const SellerOrderDetailScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<SellerOrderDetailScreen> createState() => _SellerOrderDetailScreenState();
}

class _SellerOrderDetailScreenState extends ConsumerState<SellerOrderDetailScreen> {
  bool _updating = false;

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _updating = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/api/v1/seller/orders/${widget.orderId}/status', data: {'status': newStatus});
      ref.invalidate(sellerOrderDetailProvider(widget.orderId));
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status updated to $newStatus'), backgroundColor: const Color(0xFF10B981)));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  @override
  Widget build(BuildContext context, ) {
    final order = ref.watch(sellerOrderDetailProvider(widget.orderId));

    return Scaffold(
      appBar: AppBar(title: const Text('Order Details')),
      body: order.when(
        data: (o) {
          if (o == null) return const Center(child: Text('Order not found'));
          final status = o['status'] as String? ?? 'PENDING';
          final items = (o['items'] as List?) ?? [];
          final total = (o['total'] ?? o['totalAmount'] ?? 0).toDouble();
          final address = o['shippingAddress'] as Map<String, dynamic>?;

          final nextStatuses = <String>[];
          if (status == 'PENDING') nextStatuses.add('CONFIRMED');
          if (status == 'CONFIRMED') nextStatuses.add('IN_TRANSIT');
          if (status == 'IN_TRANSIT') nextStatuses.add('DELIVERED');
          if (status != 'DELIVERED' && status != 'CANCELLED') nextStatuses.add('CANCELLED');

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Status & action
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: const Color(0xFFF9FAFB), borderRadius: BorderRadius.circular(12)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Status: $status', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 12),
                  if (nextStatuses.isNotEmpty)
                    Wrap(spacing: 8, children: nextStatuses.map((s) => ElevatedButton(
                      onPressed: _updating ? null : () => _updateStatus(s),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: s == 'CANCELLED' ? Colors.red : const Color(0xFFF97316),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: Text('Mark as ${s.replaceAll('_', ' ')}', style: const TextStyle(fontSize: 12)),
                    )).toList()),
                ]),
              ),
              const SizedBox(height: 20),

              const Text('Items', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              ...items.map((item) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(border: Border.all(color: const Color(0xFFF3F4F6)), borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(item['productName'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    Text('Qty: ${item['quantity']}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  ])),
                  Text('Rs ${((item['unitPrice'] ?? item['price'] ?? 0) as num * (item['quantity'] as int? ?? 1)).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700)),
                ]),
              )),

              const SizedBox(height: 16),
              if (address != null) ...[
                const Text('Delivery Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text('${address['street'] ?? ''}, ${address['city'] ?? ''}, ${address['province'] ?? ''}',
                    style: const TextStyle(color: Colors.grey)),
                const SizedBox(height: 16),
              ],

              const Divider(),
              const SizedBox(height: 8),
              Row(children: [
                const Expanded(child: Text('Total', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                Text('Rs ${total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFFF97316))),
              ]),
            ]),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
