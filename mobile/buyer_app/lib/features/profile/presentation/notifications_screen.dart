import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';

final notificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/notifications');
  return res.data['data'] as List? ?? [];
});

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  Future<void> _markRead(String id) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/api/v1/notifications/$id/read');
      ref.invalidate(notificationsProvider);
    } catch (_) {}
  }

  Future<void> _markAllRead() async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/api/v1/notifications/read-all');
      ref.invalidate(notificationsProvider);
    } catch (_) {}
  }

  IconData _typeIcon(String? type) {
    switch (type) {
      case 'ORDER': return Icons.receipt_long_outlined;
      case 'PAYMENT': return Icons.payment_outlined;
      case 'DELIVERY': return Icons.local_shipping_outlined;
      case 'PROMO': return Icons.local_offer_outlined;
      default: return Icons.notifications_none_rounded;
    }
  }

  Color _typeColor(String? type) {
    switch (type) {
      case 'ORDER': return const Color(0xFF2563EB);
      case 'PAYMENT': return const Color(0xFF059669);
      case 'DELIVERY': return const Color(0xFFF97316);
      case 'PROMO': return const Color(0xFF7C3AED);
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifs = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(onPressed: _markAllRead, child: const Text('Mark all read')),
        ],
      ),
      body: notifs.when(
        data: (data) => data.isEmpty
            ? const Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.notifications_none_rounded, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No notifications yet'),
                ]),
              )
            : ListView.builder(
                itemCount: data.length,
                itemBuilder: (_, i) {
                  final n = data[i] as Map<String, dynamic>;
                  final isRead = n['isRead'] as bool? ?? true;
                  final type = n['type'] as String?;
                  return Container(
                    color: isRead ? null : const Color(0xFFFFF7ED),
                    child: ListTile(
                      leading: Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(
                          color: _typeColor(type).withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(_typeIcon(type), color: _typeColor(type), size: 22),
                      ),
                      title: Text(n['title'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(n['body'] as String? ?? '', style: const TextStyle(fontSize: 13)),
                        Text(
                          (n['createdAt'] as String?)?.substring(0, 10) ?? '',
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ]),
                      onTap: isRead ? null : () => _markRead(n['_id'] as String? ?? ''),
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
