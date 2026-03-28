import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';

final orderDetailProvider = FutureProvider.family<dynamic, String>((ref, id) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/orders/$id');
  return res.data['data'];
});

class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen({super.key, required this.orderId});
  final String orderId;

  Color _statusColor(String s) {
    switch (s) {
      case 'DELIVERED': return const Color(0xFF059669);
      case 'CANCELLED': return const Color(0xFFDC2626);
      case 'IN_TRANSIT': return const Color(0xFF2563EB);
      default: return const Color(0xFFF59E0B);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderDetailProvider(orderId));

    return Scaffold(
      appBar: AppBar(title: const Text('Order Details')),
      body: order.when(
        data: (o) {
          if (o == null) return const Center(child: Text('Order not found'));
          final status = o['status'] as String? ?? 'PENDING';
          final items = (o['items'] as List?) ?? [];
          final total = (o['total'] ?? o['totalAmount'] ?? 0).toDouble();
          final address = o['shippingAddress'] as Map<String, dynamic>?;
          final payment = o['paymentMethod'] as String? ?? '';
          final date = o['createdAt'] as String?;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Status banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _statusColor(status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _statusColor(status).withOpacity(0.3)),
                ),
                child: Row(children: [
                  Icon(_statusIcon(status), color: _statusColor(status), size: 28),
                  const SizedBox(width: 12),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(status.replaceAll('_', ' '), style: TextStyle(color: _statusColor(status), fontWeight: FontWeight.w700, fontSize: 16)),
                    if (date != null)
                      Text('Placed on ${date.substring(0, 10)}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  ]),
                  const Spacer(),
                  if (status == 'IN_TRANSIT')
                    ElevatedButton(
                      onPressed: () => context.go('/orders/$orderId/track'),
                      style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      child: const Text('Track'),
                    ),
                ]),
              ),
              const SizedBox(height: 20),

              // Items
              const Text('Items', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              ...items.map((item) {
                final unitPrice = (item['unitPrice'] ?? item['price'] ?? 0).toDouble();
                final qty = item['quantity'] as int? ?? 1;
                final image = item['productImage'] as String?;
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(border: Border.all(color: const Color(0xFFF3F4F6)), borderRadius: BorderRadius.circular(12)),
                  child: Row(children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: image != null
                          ? Image.network(image, width: 56, height: 56, fit: BoxFit.cover)
                          : Container(width: 56, height: 56, color: const Color(0xFFF3F4F6), child: const Icon(Icons.image_outlined, color: Colors.grey)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(item['productName'] as String? ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      Text('Qty: $qty', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                    ])),
                    Text('Rs ${(unitPrice * qty).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  ]),
                );
              }),

              const SizedBox(height: 20),
              // Delivery address
              if (address != null) ...[
                const Text('Delivery Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(border: Border.all(color: const Color(0xFFF3F4F6)), borderRadius: BorderRadius.circular(12)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(address['label'] as String? ?? 'Home', style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text('${address['street'] ?? ''}, ${address['city'] ?? ''}, ${address['province'] ?? ''}',
                        style: const TextStyle(color: Colors.grey, fontSize: 13)),
                  ]),
                ),
                const SizedBox(height: 20),
              ],

              // Price breakdown
              const Text('Payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(border: Border.all(color: const Color(0xFFF3F4F6)), borderRadius: BorderRadius.circular(12)),
                child: Column(children: [
                  _PriceRow(label: 'Subtotal', value: 'Rs ${total.toStringAsFixed(0)}'),
                  const SizedBox(height: 6),
                  _PriceRow(label: 'Delivery', value: payment == 'COD' ? 'Rs 100' : 'Free'),
                  const Divider(height: 20),
                  _PriceRow(
                    label: 'Total',
                    value: 'Rs ${(total + (payment == 'COD' ? 100 : 0)).toStringAsFixed(0)}',
                    bold: true,
                    color: const Color(0xFFF97316),
                  ),
                  const SizedBox(height: 6),
                  _PriceRow(label: 'Payment Method', value: payment),
                ]),
              ),
            ]),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  IconData _statusIcon(String s) {
    switch (s) {
      case 'DELIVERED': return Icons.check_circle_rounded;
      case 'CANCELLED': return Icons.cancel_rounded;
      case 'IN_TRANSIT': return Icons.local_shipping_outlined;
      default: return Icons.hourglass_empty_rounded;
    }
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({required this.label, required this.value, this.bold = false, this.color});
  final String label, value;
  final bool bold;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(child: Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.normal))),
      Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w600, color: color)),
    ]);
  }
}
