import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../core/network/api_client.dart';

final adminStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/admin/dashboard');
  return res.data['data'] as Map<String, dynamic>? ?? {};
});

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(adminStatsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF7C3AED))),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(adminStatsProvider),
        child: stats.when(
          data: (s) {
            final chart = (s['revenueChart'] as List?)?.cast<Map<String, dynamic>>() ?? [];
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.5,
                  children: [
                    _StatCard(title: 'Total Revenue', value: 'Rs ${((s['totalRevenue'] ?? 0) as num).toStringAsFixed(0)}', icon: Icons.attach_money_rounded, color: const Color(0xFF059669)),
                    _StatCard(title: 'Total Orders', value: '${s['totalOrders'] ?? 0}', icon: Icons.receipt_long_rounded, color: const Color(0xFF2563EB)),
                    _StatCard(title: 'Total Users', value: '${s['totalUsers'] ?? 0}', icon: Icons.people_rounded, color: const Color(0xFFF97316)),
                    _StatCard(title: 'Active Sellers', value: '${s['activeSellers'] ?? 0}', icon: Icons.store_rounded, color: const Color(0xFF7C3AED)),
                    _StatCard(title: 'Pending Orders', value: '${s['pendingOrders'] ?? 0}', icon: Icons.hourglass_empty_rounded, color: const Color(0xFFF59E0B)),
                    _StatCard(title: 'Products', value: '${s['totalProducts'] ?? 0}', icon: Icons.inventory_2_rounded, color: const Color(0xFFEC4899)),
                  ],
                ),
                const SizedBox(height: 24),
                if (chart.isNotEmpty) ...[
                  const Text('Revenue Trend', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 180,
                    child: LineChart(
                      LineChartData(
                        gridData: const FlGridData(show: false),
                        borderData: FlBorderData(show: false),
                        titlesData: const FlTitlesData(show: false),
                        lineBarsData: [
                          LineChartBarData(
                            spots: List.generate(chart.length, (i) => FlSpot(i.toDouble(), ((chart[i]['revenue'] ?? 0) as num).toDouble())),
                            isCurved: true,
                            color: const Color(0xFF7C3AED),
                            barWidth: 3,
                            belowBarData: BarAreaData(show: true, color: const Color(0xFF7C3AED).withOpacity(0.1)),
                            dotData: const FlDotData(show: false),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ]),
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Error: $e')),
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
          child: Icon(icon, color: color, size: 18),
        ),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        Text(title, style: const TextStyle(color: Colors.grey, fontSize: 11)),
      ]),
    );
  }
}
