import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';

final deliveryHistoryProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/delivery/agent/orders', queryParameters: {'status': 'DELIVERED'});
  return res.data['data'] as List? ?? [];
});

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(deliveryHistoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Delivery History')),
      body: history.when(
        data: (data) {
          final totalEarned = data.fold<double>(0, (s, d) => s + ((d['agentEarning'] ?? d['deliveryFee'] ?? 0) as num).toDouble());
          return Column(children: [
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF7C3AED)]),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Total Deliveries', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  Text('${data.length}', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                ]),
                const Spacer(),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  const Text('Total Earned', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  Text('Rs ${totalEarned.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                ]),
              ]),
            ),
            Expanded(
              child: data.isEmpty
                  ? const Center(child: Text('No deliveries yet', style: TextStyle(color: Colors.grey)))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: data.length,
                      itemBuilder: (_, i) {
                        final d = data[i];
                        final orderId = d['_id'] as String? ?? '';
                        final address = d['shippingAddress'] as Map<String, dynamic>?;
                        final date = d['updatedAt'] as String?;
                        final earning = (d['agentEarning'] ?? d['deliveryFee'] ?? 0).toDouble();
                        return ListTile(
                          leading: Container(
                            width: 40, height: 40,
                            decoration: const BoxDecoration(color: Color(0xFFEFF6FF), shape: BoxShape.circle),
                            child: const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF2563EB), size: 22),
                          ),
                          title: Text('#${orderId.length > 8 ? orderId.substring(orderId.length - 8) : orderId}', style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            address != null ? '${address['city'] ?? ''}' : '',
                            style: const TextStyle(fontSize: 12),
                          ),
                          trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                            Text('Rs ${earning.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                            if (date != null) Text(date.substring(0, 10), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          ]),
                        );
                      },
                    ),
            ),
          ]);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
