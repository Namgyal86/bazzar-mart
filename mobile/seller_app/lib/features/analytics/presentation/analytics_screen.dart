import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../core/network/api_client.dart';

final analyticsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/seller/analytics');
  return res.data['data'] as Map<String, dynamic>? ?? {};
});

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analytics = ref.watch(analyticsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Analytics')),
      body: analytics.when(
        data: (data) {
          final revenueChart = (data['revenueByMonth'] as List?)?.cast<Map<String, dynamic>>() ?? [];
          final topProducts = (data['topProducts'] as List?) ?? [];

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Summary cards
              Row(children: [
                Expanded(child: _MetricCard(label: 'This Month', value: 'Rs ${((data['monthRevenue'] ?? 0) as num).toStringAsFixed(0)}', sub: 'Revenue')),
                const SizedBox(width: 12),
                Expanded(child: _MetricCard(label: 'This Month', value: '${data['monthOrders'] ?? 0}', sub: 'Orders')),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: _MetricCard(label: 'Average', value: 'Rs ${((data['avgOrderValue'] ?? 0) as num).toStringAsFixed(0)}', sub: 'Order Value')),
                const SizedBox(width: 12),
                Expanded(child: _MetricCard(label: 'Total', value: '${data['totalCustomers'] ?? 0}', sub: 'Customers')),
              ]),
              const SizedBox(height: 24),

              if (revenueChart.isNotEmpty) ...[
                const Text('Monthly Revenue', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                SizedBox(
                  height: 200,
                  child: BarChart(
                    BarChartData(
                      gridData: const FlGridData(show: false),
                      borderData: FlBorderData(show: false),
                      titlesData: FlTitlesData(
                        bottomTitles: AxisTitles(sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (v, _) {
                            final idx = v.toInt();
                            if (idx >= 0 && idx < revenueChart.length) {
                              return Text(revenueChart[idx]['month'] as String? ?? '', style: const TextStyle(fontSize: 9));
                            }
                            return const SizedBox.shrink();
                          },
                        )),
                        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      ),
                      barGroups: List.generate(revenueChart.length, (i) => BarChartGroupData(
                        x: i,
                        barRods: [BarChartRodData(
                          toY: ((revenueChart[i]['revenue'] ?? 0) as num).toDouble(),
                          color: const Color(0xFFF97316),
                          width: 16,
                          borderRadius: BorderRadius.circular(4),
                        )],
                      )),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],

              if (topProducts.isNotEmpty) ...[
                const Text('Top Products', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                ...topProducts.take(5).map((p) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(p['name'] as String? ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  subtitle: Text('${p['totalSold'] ?? 0} sold', style: const TextStyle(fontSize: 12)),
                  trailing: Text('Rs ${((p['revenue'] ?? 0) as num).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFF97316))),
                )),
              ],
            ]),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value, required this.sub});
  final String label, value, sub;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFF3F4F6)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        Text(sub, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      ]),
    );
  }
}
