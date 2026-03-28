import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';

final sellersProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/admin/sellers');
  return res.data['data'] as List? ?? [];
});

class SellersScreen extends ConsumerWidget {
  const SellersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sellers = ref.watch(sellersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Sellers')),
      body: sellers.when(
        data: (data) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: data.length,
          itemBuilder: (_, i) {
            final s = data[i];
            final shopName = s['shopName'] as String? ?? s['firstName'] as String? ?? 'Seller';
            final status = s['sellerStatus'] as String? ?? 'PENDING';
            final isVerified = status == 'APPROVED';

            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFFF3F4F6),
                  child: Text(shopName[0], style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                title: Text(shopName, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(s['email'] as String? ?? '', style: const TextStyle(fontSize: 12)),
                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isVerified ? const Color(0xFFD1FAE5) : status == 'REJECTED' ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isVerified ? const Color(0xFF059669) : status == 'REJECTED' ? const Color(0xFFDC2626) : const Color(0xFFD97706)),
                    ),
                  ),
                  if (status == 'PENDING') ...[
                    const SizedBox(width: 4),
                    IconButton(
                      icon: const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF059669), size: 22),
                      onPressed: () async {
                        final dio = ref.read(apiClientProvider);
                        await dio.patch('/api/v1/admin/sellers/${s['_id']}/approve');
                        ref.invalidate(sellersProvider);
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.cancel_outlined, color: Colors.red, size: 22),
                      onPressed: () async {
                        final dio = ref.read(apiClientProvider);
                        await dio.patch('/api/v1/admin/sellers/${s['_id']}/reject');
                        ref.invalidate(sellersProvider);
                      },
                    ),
                  ],
                ]),
              ),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
