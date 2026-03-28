import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';

final usersProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, page) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/admin/users', queryParameters: {'page': page, 'limit': 20});
  return res.data['data'] as Map<String, dynamic>? ?? {'users': [], 'total': 0};
});

class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});

  @override
  ConsumerState<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends ConsumerState<UsersScreen> {
  int _page = 1;
  String _search = '';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _toggleBan(String userId, bool isBanned) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/api/v1/admin/users/$userId', data: {'isBanned': !isBanned});
      ref.invalidate(usersProvider(_page));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    final users = ref.watch(usersProvider(_page));

    return Scaffold(
      appBar: AppBar(title: const Text('Users')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: 'Search users...',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _search.isNotEmpty ? IconButton(icon: const Icon(Icons.clear), onPressed: () { _searchCtrl.clear(); setState(() => _search = ''); }) : null,
            ),
            onChanged: (v) => setState(() => _search = v),
          ),
        ),
        Expanded(
          child: users.when(
            data: (data) {
              final list = (data['users'] as List?) ?? [];
              final filtered = _search.isEmpty ? list : list.where((u) {
                final name = '${u['firstName'] ?? ''} ${u['lastName'] ?? ''}'.toLowerCase();
                return name.contains(_search.toLowerCase()) || (u['email'] as String? ?? '').contains(_search.toLowerCase());
              }).toList();

              return ListView.builder(
                itemCount: filtered.length,
                itemBuilder: (_, i) {
                  final u = filtered[i];
                  final name = '${u['firstName'] ?? ''} ${u['lastName'] ?? ''}'.trim();
                  final isBanned = u['isBanned'] as bool? ?? false;
                  final role = u['role'] as String? ?? 'BUYER';

                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: const Color(0xFFF3F4F6),
                      child: Text(name.isNotEmpty ? name[0] : '?', style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    title: Text(name.isEmpty ? 'Unknown' : name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: Text(u['email'] as String? ?? '', style: const TextStyle(fontSize: 12)),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(role, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        icon: Icon(isBanned ? Icons.lock_open_outlined : Icons.lock_outlined, size: 20, color: isBanned ? const Color(0xFF059669) : Colors.red),
                        onPressed: () => _toggleBan(u['_id'] as String, isBanned),
                      ),
                    ]),
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Error: $e')),
          ),
        ),
      ]),
    );
  }
}
