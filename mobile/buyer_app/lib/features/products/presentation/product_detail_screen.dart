import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

final productDetailProvider = FutureProvider.family<dynamic, String>((ref, id) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/products/$id');
  return res.data['data'];
});

final productReviewsProvider = FutureProvider.family<List<dynamic>, String>((ref, id) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/reviews/$id');
  return res.data['data'] as List? ?? [];
});

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});
  final String productId;

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int _qty = 1;
  int _imageIdx = 0;
  bool _addingToCart = false;

  Future<void> _addToCart(dynamic product) async {
    final auth = ref.read(authStateProvider).value;
    if (auth?.isAuthenticated != true) {
      context.go('/auth/login');
      return;
    }
    setState(() => _addingToCart = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/api/v1/cart/items', data: {
        'productId':   product['_id'],
        'productName': product['name'],
        'productImage': (product['images'] as List?)?.firstOrNull ?? '',
        'sellerId':    product['sellerId'] ?? '',
        'sellerName':  product['sellerName'] ?? '',
        'unitPrice':   product['salePrice'] ?? product['basePrice'] ?? product['price'] ?? 0,
        'quantity':    _qty,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Added to cart!'), backgroundColor: Color(0xFF10B981)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _addingToCart = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final product = ref.watch(productDetailProvider(widget.productId));
    final reviews = ref.watch(productReviewsProvider(widget.productId));

    return Scaffold(
      body: product.when(
        data: (p) {
          if (p == null) return const Center(child: Text('Product not found'));
          final images = (p['images'] as List?)?.cast<String>() ?? [];
          final price = (p['salePrice'] ?? p['basePrice'] ?? p['price'] ?? 0).toDouble();
          final originalPrice = (p['basePrice'] ?? p['price'] ?? 0).toDouble();
          final hasDiscount = p['salePrice'] != null && (p['salePrice'] as num) < originalPrice;
          final rating = (p['rating'] ?? p['averageRating'] ?? 0).toDouble();
          final inStock = (p['stock'] ?? p['stockQuantity'] ?? 1) > 0;

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 300,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  background: images.isNotEmpty
                      ? PageView.builder(
                          itemCount: images.length,
                          onPageChanged: (i) => setState(() => _imageIdx = i),
                          itemBuilder: (_, i) => CachedNetworkImage(imageUrl: images[i], fit: BoxFit.cover),
                        )
                      : Container(color: const Color(0xFFF3F4F6), child: const Icon(Icons.image_outlined, size: 80, color: Colors.grey)),
                ),
                actions: [
                  IconButton(icon: const Icon(Icons.favorite_border_rounded), onPressed: () {}),
                  IconButton(icon: const Icon(Icons.share_outlined), onPressed: () {}),
                ],
              ),

              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Image indicators
                    if (images.length > 1)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(images.length, (i) => Container(
                          width: i == _imageIdx ? 20 : 6,
                          height: 6,
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            color: i == _imageIdx ? const Color(0xFFF97316) : const Color(0xFFD1D5DB),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        )),
                      ),
                    const SizedBox(height: 16),

                    // Name & brand
                    Text(p['name'] as String? ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                    if (p['brand'] != null)
                      Text(p['brand'] as String, style: const TextStyle(color: Colors.grey, fontSize: 13)),

                    const SizedBox(height: 12),

                    // Price
                    Row(children: [
                      Text('Rs ${price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFFF97316))),
                      if (hasDiscount) ...[
                        const SizedBox(width: 8),
                        Text('Rs ${originalPrice.toStringAsFixed(0)}', style: const TextStyle(fontSize: 16, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
                          child: Text(
                            '-${(((originalPrice - price) / originalPrice) * 100).toInt()}%',
                            style: const TextStyle(color: Color(0xFFD97706), fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ]),
                    const SizedBox(height: 8),

                    // Rating & stock
                    Row(children: [
                      if (rating > 0) ...[
                        const Icon(Icons.star_rounded, size: 16, color: Color(0xFFF59E0B)),
                        Text(' $rating', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        const SizedBox(width: 12),
                      ],
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: inStock ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(inStock ? 'In Stock' : 'Out of Stock',
                          style: TextStyle(color: inStock ? const Color(0xFF059669) : const Color(0xFFDC2626), fontSize: 12, fontWeight: FontWeight.w600)),
                      ),
                    ]),
                    const SizedBox(height: 16),

                    // Description
                    if (p['description'] != null) ...[
                      const Text('Description', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text(p['description'] as String, style: const TextStyle(color: Colors.grey, height: 1.6)),
                      const SizedBox(height: 16),
                    ],

                    // Quantity
                    Row(children: [
                      const Text('Quantity', style: TextStyle(fontWeight: FontWeight.w600)),
                      const Spacer(),
                      Container(
                        decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(10)),
                        child: Row(children: [
                          IconButton(icon: const Icon(Icons.remove, size: 16), onPressed: () { if (_qty > 1) setState(() => _qty--); }),
                          Text('$_qty', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                          IconButton(icon: const Icon(Icons.add, size: 16), onPressed: () => setState(() => _qty++)),
                        ]),
                      ),
                    ]),
                    const SizedBox(height: 24),

                    // Reviews section
                    const Text('Reviews', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    reviews.when(
                      data: (data) => data.isEmpty
                          ? const Text('No reviews yet', style: TextStyle(color: Colors.grey))
                          : Column(children: data.take(3).map((r) => _ReviewTile(review: r)).toList()),
                      loading: () => const CircularProgressIndicator(),
                      error: (_, __) => const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 80),
                  ]),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
      bottomNavigationBar: product.maybeWhen(
        data: (p) => p == null ? null : Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 12, offset: const Offset(0, -4))],
          ),
          child: Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => context.go('/cart'),
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), side: const BorderSide(color: Color(0xFFF97316))),
                child: const Text('View Cart', style: TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: _addingToCart ? null : () => _addToCart(p),
                child: _addingToCart
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Add to Cart'),
              ),
            ),
          ]),
        ),
        orElse: () => null,
      ),
    );
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({required this.review});
  final dynamic review;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFF3F4F6)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(review['userName'] ?? 'Customer', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const Spacer(),
          Row(children: List.generate(5, (i) => Icon(
            Icons.star_rounded, size: 14,
            color: i < (review['rating'] ?? 0) ? const Color(0xFFF59E0B) : const Color(0xFFD1D5DB),
          ))),
        ]),
        if (review['comment'] != null) ...[
          const SizedBox(height: 4),
          Text(review['comment'] as String, style: const TextStyle(color: Colors.grey, fontSize: 13)),
        ],
      ]),
    );
  }
}
