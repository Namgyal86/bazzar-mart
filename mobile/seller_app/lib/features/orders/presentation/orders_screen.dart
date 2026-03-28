import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';

final sellerOrdersListProvider = FutureProvider.family<List<dynamic>, String>((ref, status) async {
  final dio = ref.read(apiClientProvider);
  final params = status == 'ALL' ? <String, dynamic>{} : <String, dynamic>{'status': status};
  final res = await dio.get('/api/v1/seller/orders', queryParameters: params);
  return res.data['data'] as List? ?? [];
});

class SellerOrdersScreen extends ConsumerStatefulWidget {
  const SellerOrdersScreen({super.key});

  @override
  ConsumerState<SellerOrdersScreen> createState() => _SellerOrdersScreenState();
}

class _SellerOrdersScreenState extends ConsumerState<SellerOrdersScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  final _statuses = ['ALL', 'PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: _statuses.length, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        bottom: TabBar(
          controller: _tab,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: _statuses.map((s) => Tab(text: s.replaceAll('_', ' '))).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: _statuses.map((s) => _OrdersList(status: s)).toList(),
      ),
    );
  }
}

class _OrdersList extends ConsumerWidget {
  const _OrdersList({required this.status});
  final String status;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(sellerOrdersListProvider(status));
    return orders.when(
      data: (data) => data.isEmpty
          ? const Center(child: Text('No orders', style: TextStyle(color: Colors.grey)))
          : RefreshIndicator(
              onRefresh: () async => ref.invalidate(sellerOrdersListProvider(status)),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: data.length,
                itemBuilder: (_, i) => _OrderCard(order: data[i]),
              ),
            ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});
  final dynamic order;

  @override
  Widget build(BuildContext context) {
    final status = order['status'] as String? ?? 'PENDING';
    final orderId = order['_id'] as String? ?? '';
    final items = (order['items'] as List?) ?? [];
    final total = (order['total'] ?? order['totalAmount'] ?? 0).toDouble();
    final date = order['createdAt'] as String?;
    final customerName = order['customerName'] ?? order['userId']?['firstName'] ?? 'Customer';

    Color statusColor;
    switch (status) {
      case 'DELIVERED': statusColor = const Color(0xFF059669); break;
      case 'CANCELLED': statusColor = const Color(0xFFDC2626); break;
      case 'IN_TRANSIT': statusColor = const Color(0xFF2563EB); break;
      case 'CONFIRMED': statusColor = const Color(0xFF7C3AED); break;
      default: statusColor = const Color(0xFFF59E0B);
    }

    return GestureDetector(
      onTap: () => context.go('/orders/$orderId'),
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text('#${orderId.length > 8 ? orderId.substring(orderId.length - 8) : orderId}', style: const TextStyle(fontWeight: FontWeight.w700))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                child: Text(status.replaceAll('_', ' '), style: TextStyle(color: statusColor, fontWeight: FontWeight.w600, fontSize: 11)),
              ),
            ]),
            const SizedBox(height: 6),
            Text(customerName.toString(), style: const TextStyle(color: Colors.grey, fontSize: 13)),
            Text('${items.length} item(s)', style: const TextStyle(color: Colors.grey, fontSize: 12)),
            if (date != null) Text(date.substring(0, 10), style: const TextStyle(color: Colors.grey, fontSize: 11)),
            const Divider(height: 16),
            Row(children: [
              const Expanded(child: Text('Total', style: TextStyle(fontWeight: FontWeight.w600))),
              Text('Rs ${total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFF97316))),
              const Icon(Icons.chevron_right_rounded, color: Colors.grey),
            ]),
          ]),
        ),
      ),
    );
  }
}
