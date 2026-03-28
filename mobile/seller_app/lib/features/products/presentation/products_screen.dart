import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/network/api_client.dart';

final sellerProductsProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/seller/products');
  return res.data['data'] as List? ?? [];
});

class ProductsScreen extends ConsumerWidget {
  const ProductsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(sellerProductsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Products')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/products/add'),
        icon: const Icon(Icons.add),
        label: const Text('Add Product'),
        backgroundColor: const Color(0xFFF97316),
        foregroundColor: Colors.white,
      ),
      body: products.when(
        data: (data) => data.isEmpty
            ? Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No products yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 24),
                  ElevatedButton(onPressed: () => context.go('/products/add'), child: const Text('Add First Product')),
                ]),
              )
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(sellerProductsProvider),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: data.length,
                  itemBuilder: (_, i) {
                    final p = data[i];
                    final price = (p['salePrice'] ?? p['basePrice'] ?? p['price'] ?? 0).toDouble();
                    final stock = p['stock'] ?? p['stockQuantity'] ?? 0;
                    final imageUrl = (p['images'] as List?)?.firstOrNull as String? ?? p['imageUrl'] as String?;
                    final isActive = p['isActive'] as bool? ?? true;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: imageUrl != null
                                ? CachedNetworkImage(imageUrl: imageUrl, width: 64, height: 64, fit: BoxFit.cover)
                                : Container(width: 64, height: 64, color: const Color(0xFFF3F4F6), child: const Icon(Icons.image_outlined, color: Colors.grey)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(p['name'] as String? ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            const SizedBox(height: 4),
                            Row(children: [
                              Text('Rs ${price.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.w700)),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: stock > 5 ? const Color(0xFFD1FAE5) : stock > 0 ? const Color(0xFFFEF3C7) : const Color(0xFFFEE2E2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text('Stock: $stock', style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: stock > 5 ? const Color(0xFF059669) : stock > 0 ? const Color(0xFFD97706) : const Color(0xFFDC2626),
                                )),
                              ),
                            ]),
                          ])),
                          Column(children: [
                            Container(
                              width: 8, height: 8,
                              decoration: BoxDecoration(color: isActive ? const Color(0xFF059669) : Colors.grey, shape: BoxShape.circle),
                            ),
                            const SizedBox(height: 8),
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 20),
                              onPressed: () => context.go('/products/${p['_id']}/edit'),
                            ),
                          ]),
                        ]),
                      ),
                    );
                  },
                ),
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
