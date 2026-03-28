import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';

final adminOrdersProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/admin/orders', queryParameters: {'limit': 50});
  return res.data['data'] as List? ?? [];
});

class AdminOrdersScreen extends ConsumerWidget {
  const AdminOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(adminOrdersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('All Orders')),
      body: orders.when(
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(adminOrdersProvider),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: data.length,
            itemBuilder: (_, i) {
              final o = data[i];
              final status = o['status'] as String? ?? 'PENDING';
              final orderId = o['_id'] as String? ?? '';
              final total = (o['total'] ?? o['totalAmount'] ?? 0).toDouble();
              final date = o['createdAt'] as String?;

              Color statusColor;
              switch (status) {
                case 'DELIVERED': statusColor = const Color(0xFF059669); break;
                case 'CANCELLED': statusColor = const Color(0xFFDC2626); break;
                case 'IN_TRANSIT': statusColor = const Color(0xFF2563EB); break;
                default: statusColor = const Color(0xFFF59E0B);
              }

              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text('#${orderId.length > 8 ? orderId.substring(orderId.length - 8) : orderId}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  subtitle: date != null ? Text(date.substring(0, 10), style: const TextStyle(fontSize: 12)) : null,
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('Rs ${total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                        child: Text(status.replaceAll('_', ' '), style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w600)),
                      ),
                    ]),
                  ]),
                ),
              );
            },
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
