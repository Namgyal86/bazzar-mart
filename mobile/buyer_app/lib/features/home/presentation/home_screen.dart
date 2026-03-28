import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

final bannersProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/banners');
  return res.data['data'] as List? ?? [];
});

final featuredProductsProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/products/featured');
  return res.data['data'] as List? ?? [];
});

final categoriesProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/categories');
  return res.data['data'] as List? ?? [];
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider).value;
    final banners = ref.watch(bannersProvider);
    final categories = ref.watch(categoriesProvider);
    final featured = ref.watch(featuredProductsProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App bar
          SliverAppBar(
            pinned: true,
            title: const Text('Bazzar', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFF97316))),
            actions: [
              IconButton(icon: const Icon(Icons.search_rounded), onPressed: () => context.go('/search')),
              IconButton(icon: const Icon(Icons.notifications_none_rounded), onPressed: () => context.go('/notifications')),
              IconButton(icon: const Icon(Icons.shopping_cart_outlined), onPressed: () => context.go('/cart')),
            ],
          ),

          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Greeting
                if (auth?.isAuthenticated == true)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Text('Hi, ${auth!.firstName ?? 'there'}! 👋', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ),

                // Hero banners
                const SizedBox(height: 12),
                banners.when(
                  data: (data) => data.isEmpty
                    ? _defaultBanner(context)
                    : CarouselSlider.builder(
                        itemCount: data.length,
                        options: CarouselOptions(height: 180, autoPlay: true, viewportFraction: 0.95, enlargeCenterPage: true),
                        itemBuilder: (_, i, __) => _BannerCard(banner: data[i]),
                      ),
                  loading: () => const SizedBox(height: 180, child: Center(child: CircularProgressIndicator())),
                  error: (_, __) => _defaultBanner(context),
                ),

                // Categories
                const SizedBox(height: 20),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Text('Shop by Category', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(height: 12),
                categories.when(
                  data: (data) => SizedBox(
                    height: 100,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: data.length,
                      itemBuilder: (_, i) => _CategoryChip(category: data[i]),
                    ),
                  ),
                  loading: () => const SizedBox(height: 100, child: Center(child: CircularProgressIndicator())),
                  error: (_, __) => const SizedBox.shrink(),
                ),

                // Featured products
                const SizedBox(height: 20),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Text('Featured Products', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(height: 12),
                featured.when(
                  data: (data) => GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
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
                  error: (_, __) => const SizedBox.shrink(),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _defaultBanner(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 8),
    child: Container(
      height: 180,
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFF97316), Color(0xFFEF4444)]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Shop Smarter', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text('Best deals across Nepal', style: TextStyle(color: Colors.white70, fontSize: 14)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go('/products'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: const Color(0xFFF97316)),
              child: const Text('Shop Now', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    ),
  );
}

class _BannerCard extends StatelessWidget {
  const _BannerCard({required this.banner});
  final dynamic banner;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        final link = banner['cta']?['link'] as String?;
        if (link != null) context.go(link);
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            colors: [
              _parseColor(banner['primaryColor'] as String? ?? '#F97316'),
              _parseColor(banner['accentColor'] as String? ?? '#EF4444'),
            ],
          ),
        ),
        child: banner['imageUrl'] != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: CachedNetworkImage(imageUrl: banner['imageUrl'] as String, fit: BoxFit.cover, width: double.infinity),
              )
            : Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (banner['eyebrow'] != null)
                      Text(banner['eyebrow'] as String, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600)),
                    Text(banner['title'] as String? ?? '', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                    if (banner['subtitle'] != null)
                      Text(banner['subtitle'] as String, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                  ],
                ),
              ),
      ),
    );
  }

  Color _parseColor(String hex) {
    final cleaned = hex.replaceAll('#', '');
    return Color(int.parse('FF$cleaned', radix: 16));
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.category});
  final dynamic category;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/products?category=${category['slug'] ?? category['_id']}'),
      child: Container(
        width: 76,
        margin: const EdgeInsets.only(right: 12),
        child: Column(children: [
          Container(
            width: 60, height: 60,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF7ED),
              borderRadius: BorderRadius.circular(16),
            ),
            child: category['icon'] != null
                ? CachedNetworkImage(imageUrl: category['icon'] as String, fit: BoxFit.contain)
                : const Icon(Icons.category_outlined, color: Color(0xFFF97316), size: 28),
          ),
          const SizedBox(height: 6),
          Text(
            category['name'] as String? ?? '',
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
        ]),
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

    return GestureDetector(
      onTap: () => context.go('/products/${product['_id']}'),
      child: Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: imageUrl != null
                    ? CachedNetworkImage(imageUrl: imageUrl, fit: BoxFit.cover, width: double.infinity)
                    : Container(
                        color: const Color(0xFFF3F4F6),
                        child: const Icon(Icons.image_outlined, size: 40, color: Colors.grey),
                      ),
              ),
            ),
            // Info
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(product['name'] as String? ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
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
