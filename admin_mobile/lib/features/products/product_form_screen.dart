import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:sreepon_admin/core/models/products.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/notifications/media_provider.dart';

final productFormProvider = StateNotifierProvider.autoDispose<ProductFormNotifier, ProductFormState>((ref) {
  return ProductFormNotifier(ref);
});

class ProductFormState {
  const ProductFormState({
    this.name = '',
    this.slug = '',
    this.sku = '',
    this.description = '',
    this.shortDescription = '',
    this.categoryId = '',
    this.basePrice = '',
    this.unit = 'BOX',
    this.isActive = true,
    this.isFeatured = false,
    this.imageBytes,
    this.imageFileName,
    this.existingImageUrl,
    this.isLoading = false,
    this.error,
  });

  final String name;
  final String slug;
  final String sku;
  final String description;
  final String shortDescription;
  final String categoryId;
  final String basePrice;
  final String unit;
  final bool isActive;
  final bool isFeatured;
  final Uint8List? imageBytes;
  final String? imageFileName;
  final String? existingImageUrl;
  final bool isLoading;
  final String? error;

  ProductFormState copyWith({
    String? name,
    String? slug,
    String? sku,
    String? description,
    String? shortDescription,
    String? categoryId,
    String? basePrice,
    String? unit,
    bool? isActive,
    bool? isFeatured,
    Uint8List? imageBytes,
    String? imageFileName,
    String? existingImageUrl,
    bool? isLoading,
    String? error,
  }) {
    return ProductFormState(
      name: name ?? this.name,
      slug: slug ?? this.slug,
      sku: sku ?? this.sku,
      description: description ?? this.description,
      shortDescription: shortDescription ?? this.shortDescription,
      categoryId: categoryId ?? this.categoryId,
      basePrice: basePrice ?? this.basePrice,
      unit: unit ?? this.unit,
      isActive: isActive ?? this.isActive,
      isFeatured: isFeatured ?? this.isFeatured,
      imageBytes: imageBytes ?? this.imageBytes,
      imageFileName: imageFileName ?? this.imageFileName,
      existingImageUrl: existingImageUrl ?? this.existingImageUrl,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class ProductFormNotifier extends StateNotifier<ProductFormState> {
  ProductFormNotifier(this.ref) : super(const ProductFormState());

  final Ref ref;

  void setField({
    String? name,
    String? slug,
    String? sku,
    String? description,
    String? shortDescription,
    String? categoryId,
    String? basePrice,
    String? unit,
    bool? isActive,
    bool? isFeatured,
  }) {
    state = state.copyWith(
      name: name,
      slug: slug,
      sku: sku,
      description: description,
      shortDescription: shortDescription,
      categoryId: categoryId,
      basePrice: basePrice,
      unit: unit,
      isActive: isActive,
      isFeatured: isFeatured,
    );
  }

  void setImage(Uint8List bytes, String fileName) {
    state = state.copyWith(imageBytes: bytes, imageFileName: fileName);
  }

  void clearImage() {
    state = state.copyWith(imageBytes: null, imageFileName: null);
  }

  Future<bool> save({String? productId}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      String? imageUrl;
      if (state.imageBytes != null && state.imageFileName != null) {
        final policy = await ref.read(signUploadProvider({
          'folder': 'sreepon/products',
          'resourceType': 'image',
        }).future);
        final uploadResult = await uploadImageToCloudinary(
          policy: policy,
          bytes: state.imageBytes!,
          fileName: state.imageFileName!,
        );
        imageUrl = uploadResult['secure_url'] as String?;
      } else if (state.existingImageUrl != null) {
        imageUrl = state.existingImageUrl;
      }

      final payload = <String, dynamic>{
        'name': state.name,
        if (state.slug.isNotEmpty) 'slug': state.slug,
        'sku': state.sku,
        if (state.description.isNotEmpty) 'description': state.description,
        if (state.shortDescription.isNotEmpty) 'shortDescription': state.shortDescription,
        if (state.categoryId.isNotEmpty) 'categoryId': state.categoryId,
        'basePrice': double.tryParse(state.basePrice) ?? 0,
        'unit': state.unit,
        'isActive': state.isActive,
        'isFeatured': state.isFeatured,
        if (imageUrl != null) 'imageUrl': imageUrl,
      };

      if (productId == null) {
        await api.post<Map<String, dynamic>>(
          path: '/admin/products',
          body: payload,
          fromJson: (json) => json as Map<String, dynamic>,
        );
      } else {
        await api.patch<Map<String, dynamic>>(
          path: '/admin/products/$productId',
          body: payload,
          fromJson: (json) => json as Map<String, dynamic>,
        );
      }
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }
}

class ProductFormScreen extends ConsumerStatefulWidget {
  const ProductFormScreen({super.key, this.productId});

  final String? productId;

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _slugController = TextEditingController();
  final _skuController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _shortDescriptionController = TextEditingController();
  final _categoryIdController = TextEditingController();
  final _basePriceController = TextEditingController();

  final _units = ['BOX', 'PACKET', 'SINGLE', 'OTHER'];

  @override
  void dispose() {
    _nameController.dispose();
    _slugController.dispose();
    _skuController.dispose();
    _descriptionController.dispose();
    _shortDescriptionController.dispose();
    _categoryIdController.dispose();
    _basePriceController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 70,
      maxWidth: 1200,
    );
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    ref.read(productFormProvider.notifier).setImage(bytes, picked.name);
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();
    final notifier = ref.read(productFormProvider.notifier);
    notifier.save(productId: widget.productId).then((success) {
      if (success && mounted) {
        Navigator.of(context).pop(true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final formState = ref.watch(productFormProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.productId == null ? 'Add Product' : 'Edit Product'),
        actions: [
          if (widget.productId != null)
            IconButton(
              icon: const Icon(Icons.delete, color: SreeponAdminTheme.red600),
              onPressed: () async {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Delete product?'),
                    content: const Text('This cannot be undone.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        child: const Text('Delete', style: TextStyle(color: SreeponAdminTheme.red600)),
                      ),
                    ],
                  ),
                );
                if (confirmed == true && mounted) {
                  try {
                    await api.delete('/admin/products/${widget.productId}');
                    if (mounted) Navigator.of(context).pop(true);
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Delete failed: $e'), backgroundColor: SreeponAdminTheme.red600),
                      );
                    }
                  }
                }
              },
            ),
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: formState.isLoading ? null : _save,
          ),
        ],
      ),
      body: formState.isLoading
          ? const Center(child: Spinner())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Product name *'),
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                    onSaved: (v) => ref.read(productFormProvider.notifier).setField(name: v),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _slugController,
                    decoration: const InputDecoration(labelText: 'Slug (URL-friendly)'),
                    onSaved: (v) => ref.read(productFormProvider.notifier).setField(slug: v ?? ''),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _skuController,
                    decoration: const InputDecoration(labelText: 'SKU *'),
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                    onSaved: (v) => ref.read(productFormProvider.notifier).setField(sku: v ?? ''),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(labelText: 'Description'),
                    maxLines: 3,
                    onSaved: (v) => ref.read(productFormProvider.notifier).setField(description: v ?? ''),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _shortDescriptionController,
                    decoration: const InputDecoration(labelText: 'Short description'),
                    maxLines: 2,
                    onSaved: (v) => ref.read(productFormProvider.notifier).setField(shortDescription: v ?? ''),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _categoryIdController,
                    decoration: const InputDecoration(labelText: 'Category ID (optional)'),
                    onSaved: (v) => ref.read(productFormProvider.notifier).setField(categoryId: v ?? ''),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _basePriceController,
                    decoration: const InputDecoration(labelText: 'Base price (₹) *'),
                    keyboardType: TextInputType.number,
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                    onSaved: (v) => ref.read(productFormProvider.notifier).setField(basePrice: v ?? ''),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'Unit'),
                    value: formState.unit,
                    items: _units
                        .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                        .toList(),
                    onChanged: (v) => ref.read(productFormProvider.notifier).setField(unit: v!),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Product image',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              OutlinedButton.icon(
                                onPressed: _pickImage,
                                icon: const Icon(Icons.image),
                                label: const Text('Pick image'),
                              ),
                              const SizedBox(width: 12),
                              if (formState.imageBytes != null)
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.memory(
                                    formState.imageBytes!,
                                    width: 100,
                                    height: 100,
                                    fit: BoxFit.cover,
                                  ),
                                )
                              else if (formState.existingImageUrl != null)
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.network(
                                    formState.existingImageUrl!,
                                    width: 100,
                                    height: 100,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Switch(
                        value: formState.isActive,
                        onChanged: (v) => ref.read(productFormProvider.notifier).setField(isActive: v),
                        activeColor: SreeponAdminTheme.flame600,
                      ),
                      const Text('Active'),
                      const SizedBox(width: 24),
                      Switch(
                        value: formState.isFeatured,
                        onChanged: (v) => ref.read(productFormProvider.notifier).setField(isFeatured: v),
                        activeColor: SreeponAdminTheme.flame600,
                      ),
                      const Text('Featured'),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: FilledButton(
                      onPressed: formState.isLoading ? null : _save,
                      child: const Text('Save product'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
