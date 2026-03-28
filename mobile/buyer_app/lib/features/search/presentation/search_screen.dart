import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/network/api_client.dart';

final searchResultsProvider = FutureProvider.family<List<dynamic>, String>((ref, query) async {
  if (query.isEmpty) return [];
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/products', queryParameters: {'search': query, 'limit': 20});
  return res.data['data'] as List? ?? [];
});

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _ctrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(searchResultsProvider(_query));

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Search products...',
            border: InputBorder.none,
            suffixIcon: _query.isNotEmpty
                ? IconButton(icon: const Icon(Icons.clear), onPressed: () { _ctrl.clear(); setState(() => _query = ''); })
                : null,
          ),
          onSubmitted: (v) => setState(() => _query = v.trim()),
          onChanged: (v) { if (v.trim().length >= 2) setState(() => _query = v.trim()); },
          textInputAction: TextInputAction.search,
        ),
      ),
      body: _query.isEmpty
          ? const Center(child: Text('Type to search products', style: TextStyle(color: Colors.grey)))
          : results.when(
              data: (data) => data.isEmpty
                  ? Center(child: Text('No results for "$_query"', style: const TextStyle(color: Colors.grey)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: data.length,
                      itemBuilder: (_, i) {
                        final p = data[i];
                        final price = (p['salePrice'] ?? p['basePrice'] ?? p['price'] ?? 0).toDouble();
                        final imageUrl = (p['images'] as List?)?.firstOrNull as String? ?? p['imageUrl'] as String?;
                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: imageUrl != null
                                ? CachedNetworkImage(imageUrl: imageUrl, width: 56, height: 56, fit: BoxFit.cover)
                                : Container(width: 56, height: 56, color: const Color(0xFFF3F4F6), child: const Icon(Icons.image_outlined, color: Colors.grey)),
                          ),
                          title: Text(p['name'] as String? ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          subtitle: Text('Rs ${price.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.w700)),
                          onTap: () => context.go('/products/${p['_id']}'),
                        );
                      },
                    ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
    );
  }
}
