import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';
import '../../cart/presentation/cart_screen.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String _gateway = 'COD';
  Map<String, dynamic>? _selectedAddress;
  bool _placing = false;
  List<dynamic> _addresses = [];
  bool _loadingAddresses = true;

  static const _gateways = [
    {'id': 'COD', 'label': 'Cash on Delivery', 'icon': Icons.money},
    {'id': 'KHALTI', 'label': 'Khalti', 'icon': Icons.payment},
    {'id': 'ESEWA', 'label': 'eSewa', 'icon': Icons.account_balance_wallet},
  ];

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/api/v1/users/addresses');
      final list = res.data['data'] as List? ?? [];
      if (mounted) {
        setState(() {
          _addresses = list;
          _selectedAddress = list.isNotEmpty ? list.first as Map<String, dynamic> : null;
          _loadingAddresses = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingAddresses = false);
    }
  }

  Future<void> _placeOrder() async {
    if (_selectedAddress == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a delivery address')));
      return;
    }
    setState(() => _placing = true);
    try {
      final dio = ref.read(apiClientProvider);
      // 1. Create order
      final orderRes = await dio.post('/api/v1/orders', data: {
        'shippingAddress': _selectedAddress,
        'paymentMethod': _gateway,
      });
      final orderId = orderRes.data['data']['_id'] as String;

      if (_gateway == 'COD') {
        if (mounted) context.go('/orders/$orderId');
        return;
      }

      // 2. Initiate payment
      final payRes = await dio.post('/api/v1/payments/initiate', data: {
        'orderId': orderId,
        'gateway': _gateway,
        'returnUrl': 'bazzar://payment/verify',
      });
      final payData = payRes.data['data'];
      final redirectUrl = payData['redirectUrl'] ?? payData['payment_url'] ?? payData['redirect'];
      if (redirectUrl != null && mounted) {
        // Open in browser / webview
        context.go('/orders/$orderId');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Delivery address
          const Text('Delivery Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          if (_loadingAddresses)
            const CircularProgressIndicator()
          else if (_addresses.isEmpty)
            OutlinedButton.icon(
              icon: const Icon(Icons.add_location_alt_outlined),
              label: const Text('Add Address'),
              onPressed: () => context.go('/profile/addresses'),
            )
          else
            ...(_addresses.map((a) {
              final addr = a as Map<String, dynamic>;
              final isSelected = _selectedAddress?['_id'] == addr['_id'];
              return GestureDetector(
                onTap: () => setState(() => _selectedAddress = addr),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border.all(color: isSelected ? const Color(0xFFF97316) : const Color(0xFFE5E7EB), width: isSelected ? 2 : 1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(children: [
                    Icon(isSelected ? Icons.radio_button_checked : Icons.radio_button_off, color: const Color(0xFFF97316)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(addr['label'] as String? ?? 'Address', style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text('${addr['street'] ?? ''}, ${addr['city'] ?? ''}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                    ])),
                  ]),
                ),
              );
            })),

          const SizedBox(height: 24),
          const Text('Payment Method', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ..._gateways.map((g) {
            final id = g['id'] as String;
            final isSelected = _gateway == id;
            return GestureDetector(
              onTap: () => setState(() => _gateway = id),
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  border: Border.all(color: isSelected ? const Color(0xFFF97316) : const Color(0xFFE5E7EB), width: isSelected ? 2 : 1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(children: [
                  Icon(g['icon'] as IconData, color: isSelected ? const Color(0xFFF97316) : Colors.grey),
                  const SizedBox(width: 12),
                  Text(g['label'] as String, style: TextStyle(fontWeight: FontWeight.w600, color: isSelected ? const Color(0xFFF97316) : null)),
                  const Spacer(),
                  if (isSelected) const Icon(Icons.check_circle_rounded, color: Color(0xFFF97316)),
                ]),
              ),
            );
          }),

          const SizedBox(height: 24),
          const Text('Order Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          cart.when(
            data: (c) {
              final items = (c['items'] as List?) ?? [];
              final total = (c['total'] ?? c['subtotal'] ?? 0).toDouble();
              return Column(children: [
                ...items.map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(children: [
                    Expanded(child: Text('${item['productName']} x${item['quantity']}', style: const TextStyle(fontSize: 13))),
                    Text('Rs ${((item['unitPrice'] ?? item['price'] ?? 0) as num * (item['quantity'] as int? ?? 1)).toStringAsFixed(0)}'),
                  ]),
                )),
                const Divider(height: 24),
                Row(children: [
                  const Expanded(child: Text('Subtotal')),
                  Text('Rs ${total.toStringAsFixed(0)}'),
                ]),
                const SizedBox(height: 4),
                Row(children: [
                  const Expanded(child: Text('Delivery')),
                  Text(_gateway == 'COD' ? 'Rs 100' : 'Free', style: TextStyle(color: _gateway == 'COD' ? null : const Color(0xFF10B981))),
                ]),
                const Divider(height: 24),
                Row(children: [
                  const Expanded(child: Text('Total', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                  Text('Rs ${(total + (_gateway == 'COD' ? 100 : 0)).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFFF97316))),
                ]),
              ]);
            },
            loading: () => const CircularProgressIndicator(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 100),
        ]),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        color: Theme.of(context).scaffoldBackgroundColor,
        child: ElevatedButton(
          onPressed: _placing ? null : _placeOrder,
          style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
          child: _placing
              ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Place Order', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        ),
      ),
    );
  }
}
