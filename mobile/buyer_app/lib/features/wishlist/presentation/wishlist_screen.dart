import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

final wishlistProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/users/wishlist');
  return res.data['data'] as List? ?? [];
});

class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider).value;
    if (auth?.isAuthenticated != true) {
      return Scaffold(
        appBar: AppBar(title: const Text('Wishlist')),
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.favorite_border_rounded, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Sign in to view your wishlist'),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: () => context.go('/auth/login'), child: const Text('Sign In')),
          ]),
        ),
      );
    }

    final wishlist = ref.watch(wishlistProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Wishlist')),
      body: wishlist.when(
        data: (data) => data.isEmpty
            ? Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.favorite_border_rounded, size: 80, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('Your wishlist is empty', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 24),
                  ElevatedButton(onPressed: () => context.go('/products'), child: const Text('Browse Products')),
                ]),
              )
            : GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.72,
                ),
                itemCount: data.length,
                itemBuilder: (_, i) {
                  final p = data[i];
                  final price = (p['salePrice'] ?? p['basePrice'] ?? p['price'] ?? 0).toDouble();
                  final imageUrl = (p['images'] as List?)?.firstOrNull as String? ?? p['imageUrl'] as String?;
                  return GestureDetector(
                    onTap: () => context.go('/products/${p['_id']}'),
                    child: Card(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Expanded(
                          child: Stack(children: [
                            ClipRRect(
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                              child: imageUrl != null
                                  ? CachedNetworkImage(imageUrl: imageUrl, fit: BoxFit.cover, width: double.infinity, height: double.infinity)
                                  : Container(color: const Color(0xFFF3F4F6), child: const Icon(Icons.image_outlined, size: 40, color: Colors.grey)),
                            ),
                            Positioned(
                              top: 8, right: 8,
                              child: GestureDetector(
                                onTap: () async {
                                  final dio = ref.read(apiClientProvider);
                                  await dio.delete('/api/v1/users/wishlist/${p['_id']}');
                                  ref.invalidate(wishlistProvider);
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                                  child: const Icon(Icons.favorite_rounded, color: Color(0xFFEF4444), size: 18),
                                ),
                              ),
                            ),
                          ]),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(10),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(p['name'] as String? ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Text('Rs ${price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFFF97316))),
                          ]),
                        ),
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
