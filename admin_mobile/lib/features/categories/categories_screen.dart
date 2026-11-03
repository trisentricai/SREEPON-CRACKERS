import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

class AdminCategoryRow {
  const AdminCategoryRow({
    required this.id,
    required this.name,
    required this.slug,
    required this.isActive,
    required this.isFeatured,
    required this.displayOrder,
    this.description,
    this.parentId,
    this.productCount,
  });

  factory AdminCategoryRow.fromJson(Map<String, dynamic> json) {
    return AdminCategoryRow(
      id: json['id'] as String,
      name: (json['name'] ?? '') as String,
      slug: (json['slug'] ?? '') as String,
      description: json['description'] as String?,
      parentId: json['parentId'] as String?,
      isActive: json['isActive'] != false,
      isFeatured: json['isFeatured'] == true,
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      productCount: (json['productCount'] as num?)?.toInt(),
    );
  }

  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? parentId;
  final bool isActive;
  final bool isFeatured;
  final int displayOrder;
  final int? productCount;
}

final categoriesProvider = FutureProvider.autoDispose<List<AdminCategoryRow>>((ref) async {
  final data = await api.get<List<dynamic>>(
    '/admin/categories',
    fromJson: (json) => json as List<dynamic>,
  );
  return data
      .whereType<Map<String, dynamic>>()
      .map(AdminCategoryRow.fromJson)
      .toList();
});

class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(categoriesProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SectionHeader(
              title: 'Categories',
              subtitle: 'Storefront navigation',
              trailing: IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => ref.invalidate(categoriesProvider),
              ),
            ),
            Expanded(
              child: async.when(
                data: (categories) {
                  if (categories.isEmpty) {
                    return const EmptyState(
                      title: 'No categories yet.',
                      subtitle: 'Tap “Add category” to create one.',
                      icon: Icons.category_outlined,
                    );
                  }
                  final byId = {for (final c in categories) c.id: c};
                  return ListView.builder(
                    padding: const EdgeInsets.only(bottom: 96),
                    itemCount: categories.length,
                    itemBuilder: (context, index) {
                      final category = categories[index];
                      return _CategoryRow(
                        category: category,
                        parentName: byId[category.parentId]?.name,
                        onEdit: () => _openForm(context, ref, category: category, categories: categories),
                        onDelete: () => _delete(context, ref, category),
                        onToggle: () => _toggle(context, ref, category),
                      );
                    },
                  );
                },
                loading: () => const Spinner(label: 'Loading categories…'),
                error: (e, _) => ErrorState(
                  message: e is ApiException ? e.message : 'Failed to load categories',
                  onRetry: () => ref.invalidate(categoriesProvider),
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final categories = ref.read(categoriesProvider).valueOrNull ?? const <AdminCategoryRow>[];
          await _openForm(context, ref, categories: categories);
        },
        icon: const Icon(Icons.add),
        label: const Text('Add category'),
      ),
    );
  }

  Future<void> _toggle(BuildContext context, WidgetRef ref, AdminCategoryRow category) async {
    try {
      await api.patch<Map<String, dynamic>>(
        path: '/admin/categories/${category.id}',
        body: {'isActive': !category.isActive},
        fromJson: (json) => json as Map<String, dynamic>,
      );
      ref.invalidate(categoriesProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e is ApiException ? e.message : 'Update failed'),
            backgroundColor: SreeponAdminTheme.red600,
          ),
        );
      }
    }
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, AdminCategoryRow category) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete “${category.name}”?'),
        content: const Text('Categories with products or sub-categories cannot be deleted.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete', style: TextStyle(color: SreeponAdminTheme.red600)),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    try {
      await api.delete('/admin/categories/${category.id}');
      ref.invalidate(categoriesProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e is ApiException ? e.message : 'Delete failed'),
            backgroundColor: SreeponAdminTheme.red600,
          ),
        );
      }
    }
  }

  Future<void> _openForm(
    BuildContext context,
    WidgetRef ref, {
    AdminCategoryRow? category,
    required List<AdminCategoryRow> categories,
  }) async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (_) => _CategoryDialog(category: category, categories: categories, ref: ref),
    );
    if (saved == true) ref.invalidate(categoriesProvider);
  }
}

class _CategoryRow extends StatelessWidget {
  const _CategoryRow({
    required this.category,
    required this.parentName,
    required this.onEdit,
    required this.onDelete,
    required this.onToggle,
  });

  final AdminCategoryRow category;
  final String? parentName;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const CircleAvatar(
              radius: 20,
              backgroundColor: SreeponAdminTheme.indigo50,
              child: Icon(Icons.category_outlined, color: SreeponAdminTheme.indigo600, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(category.name,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(
                    [
                      category.slug,
                      if (parentName != null) 'under $parentName',
                      if (category.productCount != null) '${category.productCount} products',
                    ].join(' · '),
                    style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      StatusChip(
                        text: category.isActive ? 'Active' : 'Hidden',
                        tone: category.isActive ? 'green' : 'slate',
                      ),
                      if (category.isFeatured)
                        const StatusChip(text: 'Featured', tone: 'indigo'),
                    ],
                  ),
                ],
              ),
            ),
            Column(
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Switch(
                      value: category.isActive,
                      onChanged: (_) => onToggle(),
                      activeThumbColor: SreeponAdminTheme.flame600,
                    ),
                  ],
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 20),
                      tooltip: 'Edit',
                      onPressed: onEdit,
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline,
                          size: 20, color: SreeponAdminTheme.red600),
                      tooltip: 'Delete',
                      onPressed: onDelete,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryDialog extends StatefulWidget {
  const _CategoryDialog({required this.category, required this.categories, required this.ref});

  final AdminCategoryRow? category;
  final List<AdminCategoryRow> categories;
  final WidgetRef ref;

  @override
  State<_CategoryDialog> createState() => _CategoryDialogState();
}

class _CategoryDialogState extends State<_CategoryDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _slug;
  late final TextEditingController _description;
  late final TextEditingController _displayOrder;

  String _parentId = '';
  bool _isActive = true;
  bool _isFeatured = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final category = widget.category;
    _name = TextEditingController(text: category?.name ?? '');
    _slug = TextEditingController(text: category?.slug ?? '');
    _description = TextEditingController(text: category?.description ?? '');
    _displayOrder = TextEditingController(text: (category?.displayOrder ?? 0).toString());
    _parentId = category?.parentId ?? '';
    _isActive = category?.isActive ?? true;
    _isFeatured = category?.isFeatured ?? false;
  }

  @override
  void dispose() {
    _name.dispose();
    _slug.dispose();
    _description.dispose();
    _displayOrder.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });

    final payload = <String, dynamic>{
      'name': _name.text.trim(),
      'description': _description.text.trim(),
      'parentId': _parentId.isEmpty ? null : _parentId,
      'isActive': _isActive,
      'isFeatured': _isFeatured,
      'displayOrder': int.tryParse(_displayOrder.text.trim()) ?? 0,
      if (_slug.text.trim().isNotEmpty) 'slug': _slug.text.trim(),
    };

    try {
      if (widget.category == null) {
        await api.post<Map<String, dynamic>>(
          path: '/admin/categories',
          body: payload,
          fromJson: (json) => json as Map<String, dynamic>,
        );
      } else {
        await api.patch<Map<String, dynamic>>(
          path: '/admin/categories/${widget.category!.id}',
          body: payload,
          fromJson: (json) => json as Map<String, dynamic>,
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = e is ApiException ? e.message : 'Save failed';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final parents = widget.categories.where((c) => c.id != widget.category?.id).toList();

    return AlertDialog(
      title: Text(widget.category == null ? 'Add category' : 'Edit category'),
      content: SizedBox(
        width: double.maxFinite,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _name,
                  autofocus: true,
                  decoration: const InputDecoration(labelText: 'Name *'),
                  validator: (v) => (v == null || v.trim().length < 2) ? 'Enter at least 2 characters' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _slug,
                  decoration: const InputDecoration(labelText: 'Slug (optional)'),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _description,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: _parentId,
                  decoration: const InputDecoration(labelText: 'Parent category'),
                  items: [
                    const DropdownMenuItem(value: '', child: Text('None (top level)')),
                    ...parents.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))),
                  ],
                  onChanged: (value) => setState(() => _parentId = value ?? ''),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _displayOrder,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Display order'),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _isActive,
                  onChanged: (v) => setState(() => _isActive = v),
                  activeThumbColor: SreeponAdminTheme.flame600,
                  title: const Text('Active'),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _isFeatured,
                  onChanged: (v) => setState(() => _isFeatured = v),
                  activeThumbColor: SreeponAdminTheme.flame600,
                  title: const Text('Featured'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!, style: const TextStyle(color: SreeponAdminTheme.red600)),
                ],
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? const SizedBox(
                  width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(widget.category == null ? 'Create' : 'Save'),
        ),
      ],
    );
  }
}
