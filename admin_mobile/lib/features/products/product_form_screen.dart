import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:sreepon_admin/core/models/products.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/notifications/media_provider.dart';

/// Minimal category record for the product form dropdown.
class AdminCategory {
  const AdminCategory({required this.id, required this.name, this.isActive = true});

  factory AdminCategory.fromJson(Map<String, dynamic> json) {
    return AdminCategory(
      id: json['id'] as String,
      name: (json['name'] ?? '') as String,
      isActive: json['isActive'] != false,
    );
  }

  final String id;
  final String name;
  final bool isActive;
}

final adminCategoriesProvider = FutureProvider.autoDispose<List<AdminCategory>>((ref) async {
  final data = await api.get<List<dynamic>>(
    '/admin/categories',
    fromJson: (json) => json as List<dynamic>,
  );
  return data
      .whereType<Map<String, dynamic>>()
      .map(AdminCategory.fromJson)
      .toList();
});

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
  final _basePriceController = TextEditingController();
  final _mrpPriceController = TextEditingController();
  final _piecesPerBoxController = TextEditingController();

  static const _units = ['BOX', 'PACKET', 'SINGLE', 'OTHER'];

  String _categoryId = '';
  String _unit = 'BOX';
  bool _isActive = true;
  bool _isApproved = true;
  bool _isFeatured = false;

  List<ProductImage> _existingImages = const [];
  Uint8List? _newImageBytes;
  String? _newImageName;

  bool _loading = false;
  bool _saving = false;
  String? _loadError;

  bool get _isEdit => widget.productId != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) {
      _loadProduct();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _slugController.dispose();
    _skuController.dispose();
    _descriptionController.dispose();
    _shortDescriptionController.dispose();
    _basePriceController.dispose();
    _mrpPriceController.dispose();
    _piecesPerBoxController.dispose();
    super.dispose();
  }

  Future<void> _loadProduct() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final product = await api.get<Product>(
        '/admin/products/${widget.productId}',
        fromJson: (json) => Product.fromJson(json as Map<String, dynamic>),
      );
      if (!mounted) return;
      setState(() {
        _nameController.text = product.name;
        _slugController.text = product.slug ?? '';
        _skuController.text = product.sku ?? '';
        _descriptionController.text = product.description ?? '';
        _shortDescriptionController.text = product.shortDescription ?? '';
        _basePriceController.text = product.basePrice;
        _mrpPriceController.text = product.mrpPrice ?? '';
        _piecesPerBoxController.text = product.piecesPerBox?.toString() ?? '';
        _categoryId = product.categoryId ?? '';
        _unit = _units.contains(product.unit) ? product.unit! : 'BOX';
        _isActive = product.isActive;
        _isApproved = product.isApproved;
        _isFeatured = product.isFeatured;
        _existingImages = product.images;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = e is ApiException ? e.message : 'Failed to load product';
      });
    }
  }

  Future<void> _pickImage() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 70,
      maxWidth: 1200,
    );
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    if (!mounted) return;
    setState(() {
      _newImageBytes = bytes;
      _newImageName = picked.name;
    });
  }

  Future<Map<String, dynamic>?> _uploadNewImage() async {
    if (_newImageBytes == null || _newImageName == null) return null;
    final policy = await ref.read(signUploadProvider({
      'folder': 'sreepon/products',
      'resourceType': 'image',
    }).future);
    return uploadImageToCloudinary(
      policy: policy,
      bytes: _newImageBytes!,
      fileName: _newImageName!,
    );
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    FocusScope.of(context).unfocus();
    setState(() => _saving = true);

    try {
      final uploaded = await _uploadNewImage();

      final payload = <String, dynamic>{
        'name': _nameController.text.trim(),
        'sku': _skuController.text.trim(),
        'basePrice': double.tryParse(_basePriceController.text.trim()) ?? 0,
        'unit': _unit,
        'isActive': _isActive,
        'isApproved': _isApproved,
        'isFeatured': _isFeatured,
        if (_slugController.text.trim().isNotEmpty) 'slug': _slugController.text.trim(),
        if (_descriptionController.text.trim().isNotEmpty)
          'description': _descriptionController.text.trim(),
        if (_shortDescriptionController.text.trim().isNotEmpty)
          'shortDescription': _shortDescriptionController.text.trim(),
        if (_categoryId.isNotEmpty) 'categoryId': _categoryId,
        if (_mrpPriceController.text.trim().isNotEmpty)
          'mrpPrice': double.tryParse(_mrpPriceController.text.trim()) ?? 0,
        if (_piecesPerBoxController.text.trim().isNotEmpty)
          'piecesPerBox': int.tryParse(_piecesPerBoxController.text.trim()) ?? 1,
      };

      if (!_isEdit) {
        if (uploaded != null) {
          payload['images'] = [
            {
              'url': uploaded['secure_url'],
              if ((uploaded['public_id'] as String?)?.isNotEmpty ?? false)
                'cloudinaryPublicId': uploaded['public_id'],
            },
          ];
        }
        await api.post<Map<String, dynamic>>(
          path: '/admin/products',
          body: payload,
          fromJson: (json) => json as Map<String, dynamic>,
        );
      } else {
        await api.patch<Map<String, dynamic>>(
          path: '/admin/products/${widget.productId}',
          body: payload,
          fromJson: (json) => json as Map<String, dynamic>,
        );
        if (uploaded != null) {
          await api.post<Map<String, dynamic>>(
            path: '/admin/products/${widget.productId}/images',
            body: {
              'url': uploaded['secure_url'],
              'cloudinaryPublicId': (uploaded['public_id'] as String?) ?? '',
              'objectPosition': 'CENTER',
            },
            fromJson: (json) => json as Map<String, dynamic>,
          );
        }
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Save failed: $e'),
          backgroundColor: SreeponAdminTheme.red600,
        ),
      );
    }
  }

  Future<void> _delete() async {
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
    if (confirmed != true || !mounted) return;

    try {
      await api.delete('/admin/products/${widget.productId}');
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e is ApiException ? e.message : 'Delete failed'),
            backgroundColor: SreeponAdminTheme.red600,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(adminCategoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Product' : 'Add Product'),
        actions: [
          if (_isEdit)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: SreeponAdminTheme.red600),
              tooltip: 'Delete',
              onPressed: _saving ? null : _delete,
            ),
          IconButton(
            icon: const Icon(Icons.save),
            tooltip: 'Save',
            onPressed: (_saving || _loading) ? null : _save,
          ),
        ],
      ),
      body: _loading
          ? const Spinner(label: 'Loading product…')
          : _loadError != null
              ? ErrorState(message: _loadError!, onRetry: _loadProduct)
              : Form(
                  key: _formKey,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                    children: [
                      TextFormField(
                        controller: _nameController,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(labelText: 'Product name *'),
                        validator: (v) =>
                            (v == null || v.trim().length < 2) ? 'Enter at least 2 characters' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _slugController,
                        decoration: const InputDecoration(
                          labelText: 'Slug (optional)',
                          helperText: 'Lowercase letters, numbers and hyphens',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _skuController,
                        decoration: const InputDecoration(labelText: 'SKU *'),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _shortDescriptionController,
                        maxLines: 2,
                        decoration: const InputDecoration(labelText: 'Short description'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _descriptionController,
                        maxLines: 4,
                        decoration: const InputDecoration(labelText: 'Description'),
                      ),
                      const SizedBox(height: 12),
                      categoriesAsync.when(
                        data: (categories) {
                          final hasSelected = _categoryId.isEmpty ||
                              categories.any((c) => c.id == _categoryId);
                          return DropdownButtonFormField<String>(
                            key: ValueKey('category-$_categoryId-${categories.length}'),
                            initialValue: hasSelected
                                ? _categoryId
                                : (categories.isNotEmpty ? categories.first.id : ''),
                            decoration: const InputDecoration(labelText: 'Category'),
                            items: [
                              const DropdownMenuItem(value: '', child: Text('No category')),
                              ...categories.map(
                                (c) => DropdownMenuItem(
                                  value: c.id,
                                  child: Text(c.isActive ? c.name : '${c.name} (inactive)'),
                                ),
                              ),
                            ],
                            onChanged: (value) => setState(() => _categoryId = value ?? ''),
                          );
                        },
                        loading: () => const LinearProgressIndicator(),
                        error: (_, __) => const Text(
                          'Could not load categories',
                          style: TextStyle(color: SreeponAdminTheme.red600),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _basePriceController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(labelText: 'Selling price (₹) *'),
                              validator: (v) {
                                final price = double.tryParse(v?.trim() ?? '');
                                return (price == null || price < 0) ? 'Enter a valid price' : null;
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _mrpPriceController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(labelText: 'MRP (₹)'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: _unit,
                              decoration: const InputDecoration(labelText: 'Unit'),
                              items: _units
                                  .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                                  .toList(),
                              onChanged: (value) => setState(() => _unit = value ?? 'BOX'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _piecesPerBoxController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Pieces per box'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Product image',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 4),
                              const Text(
                                'Uploaded to Cloudinary and attached to the product.',
                                style: TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500),
                              ),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 12,
                                runSpacing: 12,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  if (_newImageBytes != null)
                                    _ImageBox(
                                      child: Image.memory(_newImageBytes!,
                                          width: 96, height: 96, fit: BoxFit.cover),
                                    )
                                  else if (_existingImages.isNotEmpty)
                                    _ImageBox(
                                      child: Image.network(_existingImages.first.url,
                                          width: 96, height: 96, fit: BoxFit.cover),
                                    ),
                                  Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      OutlinedButton.icon(
                                        onPressed: _saving ? null : _pickImage,
                                        icon: const Icon(Icons.image_outlined),
                                        label: Text(_newImageBytes == null ? 'Pick image' : 'Change image'),
                                      ),
                                      if (_newImageBytes != null)
                                        TextButton(
                                          onPressed: () => setState(() {
                                            _newImageBytes = null;
                                            _newImageName = null;
                                          }),
                                          child: const Text('Remove new image'),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                              if (_existingImages.length > 1) ...[
                                const SizedBox(height: 8),
                                Text('${_existingImages.length} images already attached',
                                    style: const TextStyle(
                                        fontSize: 12, color: SreeponAdminTheme.slate500)),
                              ],
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Column(
                            children: [
                              SwitchListTile(
                                value: _isActive,
                                onChanged: (v) => setState(() => _isActive = v),
                                activeThumbColor: SreeponAdminTheme.flame600,
                                title: const Text('Published'),
                                subtitle: const Text('Visible on the storefront when approved'),
                              ),
                              SwitchListTile(
                                value: _isApproved,
                                onChanged: (v) => setState(() => _isApproved = v),
                                activeThumbColor: SreeponAdminTheme.flame600,
                                title: const Text('Approved'),
                                subtitle: const Text('Required for the product to go live'),
                              ),
                              SwitchListTile(
                                value: _isFeatured,
                                onChanged: (v) => setState(() => _isFeatured = v),
                                activeThumbColor: SreeponAdminTheme.flame600,
                                title: const Text('Featured'),
                                subtitle: const Text('Highlight on the homepage'),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        height: 48,
                        child: FilledButton(
                          onPressed: _saving ? null : _save,
                          child: _saving
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : Text(_isEdit ? 'Save changes' : 'Create product'),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _ImageBox extends StatelessWidget {
  const _ImageBox({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(borderRadius: BorderRadius.circular(8), child: child);
  }
}
