import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';

final addressesProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(apiClientProvider);
  final res = await dio.get('/api/v1/users/addresses');
  return res.data['data'] as List? ?? [];
});

class AddressesScreen extends ConsumerStatefulWidget {
  const AddressesScreen({super.key});

  @override
  ConsumerState<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends ConsumerState<AddressesScreen> {
  Future<void> _deleteAddress(String id) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.delete('/api/v1/users/addresses/$id');
      ref.invalidate(addressesProvider);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
    }
  }

  void _showAddDialog() {
    final labelCtrl = TextEditingController();
    final streetCtrl = TextEditingController();
    final cityCtrl = TextEditingController();
    final provinceCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Add Address', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          TextField(controller: labelCtrl, decoration: const InputDecoration(labelText: 'Label (Home, Work...)')),
          const SizedBox(height: 12),
          TextField(controller: streetCtrl, decoration: const InputDecoration(labelText: 'Street / Tole')),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: TextField(controller: cityCtrl, decoration: const InputDecoration(labelText: 'City'))),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: provinceCtrl, decoration: const InputDecoration(labelText: 'Province'))),
          ]),
          const SizedBox(height: 12),
          TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Contact Phone')),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                try {
                  final dio = ref.read(apiClientProvider);
                  await dio.post('/api/v1/users/addresses', data: {
                    'label': labelCtrl.text.trim(),
                    'street': streetCtrl.text.trim(),
                    'city': cityCtrl.text.trim(),
                    'province': provinceCtrl.text.trim(),
                    'phone': phoneCtrl.text.trim(),
                    'country': 'Nepal',
                  });
                  ref.invalidate(addressesProvider);
                  if (mounted) Navigator.pop(context);
                } catch (e) {
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
                }
              },
              child: const Text('Save Address'),
            ),
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final addresses = ref.watch(addressesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Addresses')),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddDialog,
        backgroundColor: const Color(0xFFF97316),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: addresses.when(
        data: (data) => data.isEmpty
            ? Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.location_off_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No addresses saved'),
                  const SizedBox(height: 16),
                  ElevatedButton(onPressed: _showAddDialog, child: const Text('Add Address')),
                ]),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: data.length,
                itemBuilder: (_, i) {
                  final a = data[i] as Map<String, dynamic>;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(children: [
                        const Icon(Icons.location_on_outlined, color: Color(0xFFF97316), size: 28),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(a['label'] as String? ?? 'Address', style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text('${a['street'] ?? ''}, ${a['city'] ?? ''}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                          if (a['phone'] != null)
                            Text(a['phone'] as String, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                        ])),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: Colors.red),
                          onPressed: () => _deleteAddress(a['_id'] as String? ?? ''),
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
