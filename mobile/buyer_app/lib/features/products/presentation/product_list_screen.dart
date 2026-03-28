import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/network/api_client.dart';

final productListProvider = FutureProvider.family<List<dynamic>, Map<String, String?>>((ref, params) async {
  final dio = ref.read(apiClientProvider);
  final queryParams = <String, dynamic>{};
  params.forEach((k, v) { if (v != null && v.isNotEmpty) queryParams[k] = v; });
  final res = await dio.get('/api/v1/products', queryParameters: queryParams);
  return res.data['data'] as List? ?? [];
});

class ProductListScreen extends ConsumerStatefulWidget {
  const ProductListScreen({super.key, this.category, this.query});
  final String? category;
  final String? query;

  @override
  ConsumerState<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends ConsumerState<ProductListScreen> {
  String _sort = 'newest';
  RangeValues _priceRange = const RangeValues(0, 100000);

  Map<String, String?> get _params => {
    'category': widget.category,
    'search': widget.query,
    'sort': _sort,
    'minPrice': _priceRange.start > 0 ? _priceRange.start.toInt().toString() : null,
    'maxPrice': _priceRange.end < 100000 ? _priceRange.end.toInt().toString() : null,
  };

  @override
  Widget build(BuildContext context) {
    final products = ref.watch(productListProvider(_params));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.category != null ? widget.category! : widget.query != null ? '"${widget.query}"' : 'All Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_rounded),
            onPressed: _showFilters,
          ),
        ],
      ),
      body: products.when(
        data: (data) => data.isEmpty
            ? const Center(child: Text('No products found'))
            : GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.72,
                ),
                itemCount: data.length,
                itemBuilder: (_, i) => _ProductCard(product: data[i]),
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  void _showFilters() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Filters', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            const Text('Sort by', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Wrap(spacing: 8, children: [
              for (final s in ['newest', 'price_asc', 'price_desc', 'rating', 'popular'])
                ChoiceChip(
                  label: Text(s.replaceAll('_', ' ')),
                  selected: _sort == s,
                  onSelected: (_) => setState(() { _sort = s; Navigator.pop(context); }),
                ),
            ]),
            const SizedBox(height: 16),
            Text('Price: Rs ${_priceRange.start.toInt()} – Rs ${_priceRange.end.toInt()}', style: const TextStyle(fontWeight: FontWeight.w600)),
            RangeSlider(
              values: _priceRange,
              min: 0, max: 100000,
              divisions: 100,
              onChanged: (v) => setState(() => _priceRange = v),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product});
  final dynamic product;

  @override
  Widget build(BuildContext context) {
    final price = (product['salePrice'] ?? product['basePrice'] ?? product['price'] ?? 0).toDouble();
    final originalPrice = (product['basePrice'] ?? product['price'] ?? 0).toDouble();
    final hasDiscount = product['salePrice'] != null && (product['salePrice'] as num) < (product['basePrice'] ?? product['price'] ?? 0);
    final imageUrl = (product['images'] as List?)?.firstOrNull ?? product['imageUrl'] as String?;
    final rating = (product['rating'] ?? product['averageRating'] ?? 0).toDouble();

    return GestureDetector(
      onTap: () => context.go('/products/${product['_id']}'),
      child: Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: imageUrl != null
                      ? CachedNetworkImage(imageUrl: imageUrl, fit: BoxFit.cover, width: double.infinity, height: double.infinity)
                      : Container(color: const Color(0xFFF3F4F6), child: const Icon(Icons.image_outlined, size: 40, color: Colors.grey)),
                ),
                if (hasDiscount)
                  Positioned(
                    top: 8, left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(6)),
                      child: Text(
                        '-${(((originalPrice - price) / originalPrice) * 100).toInt()}%',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(product['name'] as String? ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                if (rating > 0)
                  Row(children: [
                    const Icon(Icons.star_rounded, size: 12, color: Color(0xFFF59E0B)),
                    const SizedBox(width: 2),
                    Text(rating.toStringAsFixed(1), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ]),
                const SizedBox(height: 2),
                Row(children: [
                  Text('Rs ${price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFFF97316))),
                  if (hasDiscount) ...[
                    const SizedBox(width: 4),
                    Text('Rs ${originalPrice.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                  ],
                ]),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}
