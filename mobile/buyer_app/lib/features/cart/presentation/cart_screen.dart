import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';

final cartProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/cart');
  return res.data['data'] as Map<String, dynamic>? ?? {'items': [], 'total': 0};
});

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  final Map<String, bool> _updating = {};

  Future<void> _updateQty(String itemId, int qty) async {
    setState(() => _updating[itemId] = true);
    try {
      final dio = ref.read(apiClientProvider);
      if (qty <= 0) {
        await dio.delete('/api/v1/cart/items/$itemId');
      } else {
        await dio.patch('/api/v1/cart/items/$itemId', data: {'quantity': qty});
      }
      ref.invalidate(cartProvider);
    } catch (_) {}
    if (mounted) setState(() => _updating[itemId] = false);
  }

  Future<void> _clearCart() async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.delete('/api/v1/cart');
      ref.invalidate(cartProvider);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider).value;
    if (auth?.isAuthenticated != true) {
      return Scaffold(
        appBar: AppBar(title: const Text('Cart')),
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.shopping_cart_outlined, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Sign in to view your cart'),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: () => context.go('/auth/login'), child: const Text('Sign In')),
          ]),
        ),
      );
    }

    final cart = ref.watch(cartProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Cart'),
        actions: [
          cart.maybeWhen(
            data: (c) => (c['items'] as List?)?.isNotEmpty == true
                ? TextButton(onPressed: _clearCart, child: const Text('Clear', style: TextStyle(color: Colors.red)))
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: cart.when(
        data: (c) {
          final items = (c['items'] as List?) ?? [];
          if (items.isEmpty) {
            return Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.shopping_cart_outlined, size: 80, color: Colors.grey),
                const SizedBox(height: 16),
                const Text('Your cart is empty', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                const Text('Add items to get started', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 24),
                ElevatedButton(onPressed: () => context.go('/products'), child: const Text('Browse Products')),
              ]),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            itemBuilder: (_, i) {
              final item = items[i];
              final itemId = item['_id'] as String? ?? item['productId'] as String? ?? '$i';
              final qty = item['quantity'] as int? ?? 1;
              final price = (item['unitPrice'] ?? item['price'] ?? 0).toDouble();
              final image = item['productImage'] as String?;
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: image != null
                          ? Image.network(image, width: 72, height: 72, fit: BoxFit.cover)
                          : Container(width: 72, height: 72, color: const Color(0xFFF3F4F6), child: const Icon(Icons.image_outlined, color: Colors.grey)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(item['productName'] as String? ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        const SizedBox(height: 4),
                        Text('Rs ${price.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        Row(children: [
                          _QtyButton(
                            icon: Icons.remove,
                            onTap: _updating[itemId] == true ? null : () => _updateQty(itemId, qty - 1),
                          ),
                          const SizedBox(width: 12),
                          _updating[itemId] == true
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                              : Text('$qty', style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(width: 12),
                          _QtyButton(
                            icon: Icons.add,
                            onTap: _updating[itemId] == true ? null : () => _updateQty(itemId, qty + 1),
                          ),
                        ]),
                      ]),
                    ),
                    Text('Rs ${(price * qty).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  ]),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
      bottomNavigationBar: cart.maybeWhen(
        data: (c) {
          final items = (c['items'] as List?) ?? [];
          if (items.isEmpty) return null;
          final total = (c['total'] ?? c['subtotal'] ?? items.fold<double>(0, (s, i) => s + ((i['unitPrice'] ?? i['price'] ?? 0) as num).toDouble() * ((i['quantity'] as int?) ?? 1))).toDouble();
          return Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 12, offset: const Offset(0, -4))],
            ),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Total', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  Text('Rs ${total.toStringAsFixed(0)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFFF97316))),
                ]),
              ),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: () => context.go('/checkout'),
                  child: const Text('Proceed to Checkout'),
                ),
              ),
            ]),
          );
        },
        orElse: () => null,
      ),
    );
  }
}

class _QtyButton extends StatelessWidget {
  const _QtyButton({required this.icon, this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28, height: 28,
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFE5E7EB)),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, size: 16, color: onTap == null ? Colors.grey : null),
      ),
    );
  }
}
