import 'dart:typed_data';

import 'package:flutter/material.dart' hide Banner;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:sreepon_admin/core/models/banners.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/categories/categories_screen.dart';
import 'package:sreepon_admin/features/notifications/media_provider.dart';

final bannersProvider = FutureProvider.autoDispose<BannerListResponse>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/banners',
    query: {'page': 1, 'limit': 100},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return BannerListResponse.fromJson(data);
});

const _placements = [
  'HOME_HERO',
  'HOME_SECONDARY',
  'HOME_MIDDLE',
  'HOME_BOTTOM',
  'CATEGORY_TOP',
  'PRODUCT_PROMOTION',
  'APP_HOME',
];

const _actionTypes = ['LINKED_PRODUCT', 'LINKED_CATEGORY', 'CUSTOM_URL'];

class BannersScreen extends ConsumerWidget {
  const BannersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(bannersProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SectionHeader(
              title: 'Banners',
              subtitle: 'Homepage and placement banners',
              trailing: IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => ref.invalidate(bannersProvider),
              ),
            ),
            Expanded(
              child: async.when(
                data: (resp) {
                  if (resp.items.isEmpty) {
                    return const EmptyState(
                      title: 'No banners yet.',
                      subtitle: 'Tap “Add banner” to upload one.',
                      icon: Icons.image_outlined,
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: () async => ref.invalidate(bannersProvider),
                    child: ListView.builder(
                      padding: const EdgeInsets.only(bottom: 96),
                      itemCount: resp.items.length,
                      itemBuilder: (context, index) {
                        final banner = resp.items[index];
                        return _BannerRow(
                          banner: banner,
                          onEdit: () => _openForm(context, ref, banner: banner),
                          onDelete: () => _delete(context, ref, banner),
                          onToggle: () => _toggle(context, ref, banner),
                        );
                      },
                    ),
                  );
                },
                loading: () => const Spinner(label: 'Loading banners…'),
                error: (e, _) => ErrorState(
                  message: e is ApiException ? e.message : 'Failed to load banners',
                  onRetry: () => ref.invalidate(bannersProvider),
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Add banner'),
      ),
    );
  }

  Future<void> _toggle(BuildContext context, WidgetRef ref, Banner banner) async {
    try {
      await api.patch<Map<String, dynamic>>(
        path: '/admin/banners/${banner.id}/activate',
        body: {'isActive': !banner.isActive},
        fromJson: (json) => json as Map<String, dynamic>,
      );
      ref.invalidate(bannersProvider);
    } catch (e) {
      if (context.mounted) _snack(context, e is ApiException ? e.message : 'Update failed');
    }
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, Banner banner) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete “${banner.title ?? 'banner'}”?'),
        content: const Text('This banner will be removed from the storefront.'),
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
      await api.delete('/admin/banners/${banner.id}');
      ref.invalidate(bannersProvider);
    } catch (e) {
      if (context.mounted) _snack(context, e is ApiException ? e.message : 'Delete failed');
    }
  }

  Future<void> _openForm(BuildContext context, WidgetRef ref, {Banner? banner}) async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (_) => _BannerDialog(banner: banner, ref: ref),
    );
    if (saved == true) ref.invalidate(bannersProvider);
  }

  void _snack(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: SreeponAdminTheme.red600),
    );
  }
}

class _BannerRow extends StatelessWidget {
  const _BannerRow({
    required this.banner,
    required this.onEdit,
    required this.onDelete,
    required this.onToggle,
  });

  final Banner banner;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(10, 10, 4, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: banner.imageUrl != null && banner.imageUrl!.isNotEmpty
                  ? Image.network(
                      banner.imageUrl!,
                      width: 72,
                      height: 56,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const _ImagePlaceholder(),
                    )
                  : const _ImagePlaceholder(),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(banner.title ?? 'Untitled',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(
                    '${banner.placement ?? '—'} · ${banner.actionType ?? '—'}'
                    '${banner.actionTarget != null ? ' · ${banner.actionTarget}' : ''}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    children: [
                      StatusChip(
                        text: banner.isActive ? 'Active' : 'Inactive',
                        tone: banner.isActive ? 'green' : 'slate',
                      ),
                      StatusChip(text: 'Order ${banner.displayOrder}', tone: 'indigo'),
                    ],
                  ),
                ],
              ),
            ),
            Column(
              children: [
                Switch(
                  value: banner.isActive,
                  onChanged: (_) => onToggle(),
                  activeThumbColor: SreeponAdminTheme.flame600,
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
                      icon: const Icon(Icons.delete_outline, size: 20, color: SreeponAdminTheme.red600),
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

class _ImagePlaceholder extends StatelessWidget {
  const _ImagePlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72,
      height: 56,
      color: SreeponAdminTheme.slate100,
      child: const Icon(Icons.image_outlined, color: SreeponAdminTheme.slate400),
    );
  }
}

class _BannerDialog extends StatefulWidget {
  const _BannerDialog({required this.ref, this.banner});

  final Banner? banner;
  final WidgetRef ref;

  @override
  State<_BannerDialog> createState() => _BannerDialogState();
}

class _BannerDialogState extends State<_BannerDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _title;
  late final TextEditingController _subtitle;
  late final TextEditingController _actionTarget;
  late final TextEditingController _displayOrder;

  String _placement = 'HOME_HERO';
  String _actionType = 'CUSTOM_URL';
  String _categoryId = '';
  String _imageUrl = '';
  bool _isActive = true;
  bool _uploading = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final banner = widget.banner;
    _title = TextEditingController(text: banner?.title ?? '');
    _subtitle = TextEditingController(text: banner?.description ?? '');
    _actionTarget = TextEditingController(text: banner?.actionTarget ?? '');
    _displayOrder = TextEditingController(text: (banner?.displayOrder ?? 0).toString());
    _placement = _placements.contains(banner?.placement) ? banner!.placement! : 'HOME_HERO';
    _actionType = _actionTypes.contains(banner?.actionType) ? banner!.actionType! : 'CUSTOM_URL';
    _imageUrl = banner?.imageUrl ?? '';
    _isActive = banner?.isActive ?? true;
  }

  @override
  void dispose() {
    _title.dispose();
    _subtitle.dispose();
    _actionTarget.dispose();
    _displayOrder.dispose();
    super.dispose();
  }

  Future<void> _pickAndUpload() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 70,
      maxWidth: 1600,
    );
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    if (!mounted) return;
    setState(() {
      _uploading = true;
      _error = null;
    });
    try {
      final policy = await widget.ref.read(signUploadProvider({
        'folder': 'sreepon/banners',
        'resourceType': 'image',
      }).future);
      final result = await uploadImageToCloudinary(
        policy: policy,
        bytes: Uint8List.fromList(bytes),
        fileName: picked.name,
      );
      if (!mounted) return;
      setState(() {
        _imageUrl = (result['secure_url'] as String?) ?? '';
        _uploading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploading = false;
        _error = e is ApiException ? e.message : 'Upload failed';
      });
    }
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_imageUrl.isEmpty) {
      setState(() => _error = 'Please upload a banner image');
      return;
    }
    if (_actionType != 'LINKED_CATEGORY' && _actionTarget.text.trim().isEmpty) {
      setState(() => _error = 'Add a target for this action type');
      return;
    }
    if (_actionType == 'LINKED_CATEGORY' && _categoryId.isEmpty) {
      setState(() => _error = 'Choose a category');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    final payload = <String, dynamic>{
      'placement': _placement,
      'title': _title.text.trim(),
      'imageUrl': _imageUrl,
      'actionType': _actionType,
      'displayOrder': int.tryParse(_displayOrder.text.trim()) ?? 0,
      'isActive': _isActive,
      if (_subtitle.text.trim().isNotEmpty) 'subtitle': _subtitle.text.trim(),
      if (_actionType == 'LINKED_CATEGORY')
        'categoryId': _categoryId
      else if (_actionTarget.text.trim().isNotEmpty)
        'actionTarget': _actionTarget.text.trim(),
    };

    try {
      if (widget.banner == null) {
        await api.post<Map<String, dynamic>>(
          path: '/admin/banners',
          body: payload,
          fromJson: (json) => json as Map<String, dynamic>,
        );
      } else {
        await api.patch<Map<String, dynamic>>(
          path: '/admin/banners/${widget.banner!.id}',
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
    final categoriesAsync = widget.ref.watch(categoriesProvider);

    return AlertDialog(
      title: Text(widget.banner == null ? 'Add banner' : 'Edit banner'),
      content: SizedBox(
        width: double.maxFinite,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _placement,
                  decoration: const InputDecoration(labelText: 'Placement'),
                  items: _placements
                      .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                      .toList(),
                  onChanged: (v) => setState(() => _placement = v ?? _placement),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _title,
                  autofocus: widget.banner == null,
                  decoration: const InputDecoration(labelText: 'Title *'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _subtitle,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Subtitle'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: _imageUrl.isEmpty
                          ? const _ImagePlaceholder()
                          : Image.network(
                              _imageUrl,
                              width: 72,
                              height: 56,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const _ImagePlaceholder(),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: (_uploading || _saving) ? null : _pickAndUpload,
                        icon: _uploading
                            ? const SizedBox(
                                width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.cloud_upload_outlined),
                        label: Text(_imageUrl.isEmpty ? 'Upload image *' : 'Change image'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: _actionType,
                  decoration: const InputDecoration(labelText: 'Action'),
                  items: _actionTypes
                      .map((a) => DropdownMenuItem(value: a, child: Text(a)))
                      .toList(),
                  onChanged: (v) => setState(() => _actionType = v ?? _actionType),
                ),
                const SizedBox(height: 10),
                if (_actionType == 'LINKED_CATEGORY')
                  categoriesAsync.when(
                    data: (categories) => DropdownButtonFormField<String>(
                      initialValue: _categoryId.isEmpty ? null : _categoryId,
                      decoration: const InputDecoration(labelText: 'Category *'),
                      items: categories
                          .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                          .toList(),
                      onChanged: (v) => setState(() => _categoryId = v ?? ''),
                    ),
                    loading: () => const LinearProgressIndicator(),
                    error: (_, __) => const Text('Could not load categories'),
                  )
                else
                  TextFormField(
                    controller: _actionTarget,
                    decoration: const InputDecoration(
                      labelText: 'Target *',
                      hintText: 'Product slug, /path, or https://…',
                    ),
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
          onPressed: (_saving || _uploading) ? null : _save,
          child: _saving
              ? const SizedBox(
                  width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(widget.banner == null ? 'Create' : 'Save'),
        ),
      ],
    );
  }
}
