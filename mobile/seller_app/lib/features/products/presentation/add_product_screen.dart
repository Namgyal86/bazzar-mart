import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';

class AddProductScreen extends ConsumerStatefulWidget {
  const AddProductScreen({super.key, this.productId});
  final String? productId;

  @override
  ConsumerState<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends ConsumerState<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _salePriceCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();
  final _categoryCtrl = TextEditingController();
  final _brandCtrl = TextEditingController();
  bool _loading = false, _uploading = false;
  List<String> _imageUrls = [];
  bool get _isEditing => widget.productId != null;

  @override
  void initState() {
    super.initState();
    if (_isEditing) _loadProduct();
  }

  Future<void> _loadProduct() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/api/v1/products/${widget.productId}');
      final p = res.data['data'];
      _nameCtrl.text = p['name'] ?? '';
      _descCtrl.text = p['description'] ?? '';
      _priceCtrl.text = '${p['basePrice'] ?? p['price'] ?? ''}';
      _salePriceCtrl.text = '${p['salePrice'] ?? ''}';
      _stockCtrl.text = '${p['stock'] ?? p['stockQuantity'] ?? ''}';
      _categoryCtrl.text = '${p['category'] ?? ''}';
      _brandCtrl.text = '${p['brand'] ?? ''}';
      _imageUrls = (p['images'] as List?)?.cast<String>() ?? [];
      setState(() {});
    } catch (_) {}
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file == null) return;
    setState(() => _uploading = true);
    try {
      final dio = ref.read(apiClientProvider);
      final form = FormData.fromMap({'file': await MultipartFile.fromFile(file.path, filename: 'product.jpg')});
      final res = await dio.post('/api/v1/upload/image', data: form);
      final url = res.data['data']['url'] as String;
      setState(() => _imageUrls.add(url));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload failed: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final dio = ref.read(apiClientProvider);
      final data = {
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'basePrice': double.tryParse(_priceCtrl.text) ?? 0,
        if (_salePriceCtrl.text.isNotEmpty) 'salePrice': double.tryParse(_salePriceCtrl.text),
        'stock': int.tryParse(_stockCtrl.text) ?? 0,
        'category': _categoryCtrl.text.trim(),
        'brand': _brandCtrl.text.trim(),
        'images': _imageUrls,
      };
      if (_isEditing) {
        await dio.put('/api/v1/seller/products/${widget.productId}', data: data);
      } else {
        await dio.post('/api/v1/seller/products', data: data);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_isEditing ? 'Product updated!' : 'Product added!'), backgroundColor: const Color(0xFF10B981)));
        context.go('/products');
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEditing ? 'Edit Product' : 'Add Product')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Images
            const Text('Product Images', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            SizedBox(
              height: 100,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  ..._imageUrls.map((url) => Stack(
                    children: [
                      Container(
                        margin: const EdgeInsets.only(right: 8),
                        width: 100, height: 100,
                        child: ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.network(url, fit: BoxFit.cover)),
                      ),
                      Positioned(top: 4, right: 12,
                        child: GestureDetector(
                          onTap: () => setState(() => _imageUrls.remove(url)),
                          child: Container(padding: const EdgeInsets.all(2), decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle), child: const Icon(Icons.close, size: 14, color: Colors.white)),
                        )),
                    ],
                  )),
                  GestureDetector(
                    onTap: _uploading ? null : _pickImage,
                    child: Container(
                      width: 100, height: 100,
                      decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB), style: BorderStyle.solid), borderRadius: BorderRadius.circular(8), color: const Color(0xFFF9FAFB)),
                      child: _uploading ? const Center(child: CircularProgressIndicator(strokeWidth: 2)) : const Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.add_photo_alternate_outlined, color: Colors.grey), Text('Add Photo', style: TextStyle(fontSize: 11, color: Colors.grey))]),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            TextFormField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Product Name *'), validator: (v) => v!.isEmpty ? 'Required' : null),
            const SizedBox(height: 14),
            TextFormField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 3),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(child: TextFormField(controller: _priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Base Price (Rs) *'), validator: (v) => v!.isEmpty ? 'Required' : null)),
              const SizedBox(width: 12),
              Expanded(child: TextFormField(controller: _salePriceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Sale Price (Rs)'))),
            ]),
            const SizedBox(height: 14),
            TextFormField(controller: _stockCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Stock Quantity *'), validator: (v) => v!.isEmpty ? 'Required' : null),
            const SizedBox(height: 14),
            TextFormField(controller: _categoryCtrl, decoration: const InputDecoration(labelText: 'Category')),
            const SizedBox(height: 14),
            TextFormField(controller: _brandCtrl, decoration: const InputDecoration(labelText: 'Brand')),
            const SizedBox(height: 28),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _loading ? null : _save,
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_isEditing ? 'Update Product' : 'Add Product'),
              ),
            ),
            const SizedBox(height: 40),
          ]),
        ),
      ),
    );
  }
}
