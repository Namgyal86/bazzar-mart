import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

final dashboardStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/seller/dashboard');
  return res.data['data'] as Map<String, dynamic>? ?? {};
});

final recentOrdersProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/seller/orders', queryParameters: {'limit': 5});
  return res.data['data'] as List? ?? [];
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(dashboardStatsProvider);
    final orders = ref.watch(recentOrdersProvider);
    final auth = ref.watch(authStateProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: Text(auth?.shopName ?? 'My Shop', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFF97316))),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_box_outlined),
            onPressed: () => context.go('/products/add'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(dashboardStatsProvider);
          ref.invalidate(recentOrdersProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Stats grid
            stats.when(
              data: (s) => GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.6,
                children: [
                  _StatCard(title: 'Revenue', value: 'Rs ${((s['totalRevenue'] ?? 0) as num).toStringAsFixed(0)}', icon: Icons.trending_up_rounded, color: const Color(0xFF059669)),
                  _StatCard(title: 'Orders', value: '${s['totalOrders'] ?? 0}', icon: Icons.receipt_long_rounded, color: const Color(0xFF2563EB)),
                  _StatCard(title: 'Products', value: '${s['totalProducts'] ?? 0}', icon: Icons.inventory_2_rounded, color: const Color(0xFF7C3AED)),
                  _StatCard(title: 'Pending', value: '${s['pendingOrders'] ?? 0}', icon: Icons.hourglass_empty_rounded, color: const Color(0xFFF59E0B)),
                ],
              ),
              loading: () => const SizedBox(height: 200, child: Center(child: CircularProgressIndicator())),
              error: (_, __) => const SizedBox.shrink(),
            ),

            const SizedBox(height: 24),
            // Revenue chart (last 7 days)
            stats.maybeWhen(
              data: (s) {
                final chart = (s['revenueChart'] as List?)?.cast<Map<String, dynamic>>() ?? [];
                if (chart.isEmpty) return const SizedBox.shrink();
                return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Revenue (Last 7 Days)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 160,
                    child: LineChart(
                      LineChartData(
                        gridData: const FlGridData(show: false),
                        titlesData: const FlTitlesData(show: false),
                        borderData: FlBorderData(show: false),
                        lineBarsData: [
                          LineChartBarData(
                            spots: List.generate(chart.length, (i) => FlSpot(i.toDouble(), ((chart[i]['revenue'] ?? 0) as num).toDouble())),
                            isCurved: true,
                            color: const Color(0xFFF97316),
                            barWidth: 3,
                            belowBarData: BarAreaData(show: true, color: const Color(0xFFF97316).withOpacity(0.1)),
                            dotData: const FlDotData(show: false),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ]);
              },
              orElse: () => const SizedBox.shrink(),
            ),

            const Text('Recent Orders', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            orders.when(
              data: (data) => data.isEmpty
                  ? const Text('No orders yet', style: TextStyle(color: Colors.grey))
                  : Column(children: data.map((o) => _OrderTile(order: o)).toList()),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ]),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.title, required this.value, required this.icon, required this.color});
  final String title, value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFF3F4F6)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, color: color, size: 20),
        ),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        Text(title, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      ]),
    );
  }
}

class _OrderTile extends StatelessWidget {
  const _OrderTile({required this.order});
  final dynamic order;

  @override
  Widget build(BuildContext context) {
    final status = order['status'] as String? ?? 'PENDING';
    final orderId = order['_id'] as String? ?? '';
    final total = (order['total'] ?? order['totalAmount'] ?? 0).toDouble();

    Color statusColor;
    switch (status) {
      case 'DELIVERED': statusColor = const Color(0xFF059669); break;
      case 'CANCELLED': statusColor = const Color(0xFFDC2626); break;
      case 'IN_TRANSIT': statusColor = const Color(0xFF2563EB); break;
      default: statusColor = const Color(0xFFF59E0B);
    }

    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text('#${orderId.length > 8 ? orderId.substring(orderId.length - 8) : orderId}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      subtitle: Text(status.replaceAll('_', ' '), style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w600)),
      trailing: Text('Rs ${total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFF97316))),
      onTap: () => context.go('/orders/$orderId'),
    );
  }
}
