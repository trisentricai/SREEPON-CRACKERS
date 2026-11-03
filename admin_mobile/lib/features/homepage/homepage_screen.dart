import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/homepage.dart';
import 'package:sreepon_admin/core/models/products.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/homepage/homepage_provider.dart';

/// Storefront home-page composer: hero copy plus the ordered section list.
class HomepageScreen extends ConsumerStatefulWidget {
  const HomepageScreen({super.key});

  @override
  ConsumerState<HomepageScreen> createState() => _HomepageScreenState();
}

class _HomepageScreenState extends ConsumerState<HomepageScreen> {
  final _heroTitle = TextEditingController();
  final _heroTagline = TextEditingController();
  bool _hydrated = false;
  bool _savingHero = false;

  @override
  void dispose() {
    _heroTitle.dispose();
    _heroTagline.dispose();
    super.dispose();
  }

  void _hydrate(HomepageResponse resp) {
    if (_hydrated) return;
    _heroTitle.text = resp.heroTitle ?? '';
    _heroTagline.text = resp.heroTagline ?? '';
    _hydrated = true;
  }

  Future<void> _saveHero(HomepageResponse resp) async {
    setState(() => _savingHero = true);
    try {
      await api.put<Map<String, dynamic>>(
        path: '/admin/homepage',
        body: {
          ...resp.config,
          'heroTitle': _heroTitle.text.trim(),
          'heroTagline': _heroTagline.text.trim(),
        },
        fromJson: (json) => json as Map<String, dynamic>,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hero copy saved'), backgroundColor: SreeponAdminTheme.green600),
      );
    } catch (e) {
      if (!mounted) return;
      _snack(e is ApiException ? e.message : 'Could not save hero copy');
    } finally {
      if (mounted) setState(() => _savingHero = false);
    }
  }

  Future<void> _toggleSection(HomepageSection section) async {
    try {
      await api.patch<Map<String, dynamic>>(
        path: '/admin/homepage/sections/${section.id}',
        body: {'isActive': !section.isActive},
        fromJson: (json) => json as Map<String, dynamic>,
      );
      ref.invalidate(homepageProvider);
    } catch (e) {
      if (mounted) _snack(e is ApiException ? e.message : 'Could not update section');
    }
  }

  Future<void> _moveSection(List<HomepageSection> sections, int index, int direction) async {
    final target = index + direction;
    if (target < 0 || target >= sections.length) return;
    final next = [...sections];
    final item = next.removeAt(index);
    next.insert(target, item);
    try {
      await api.patch<Map<String, dynamic>>(
        path: '/admin/homepage/sections/reorder',
        body: {
          'items': [
            for (var i = 0; i < next.length; i++) {'id': next[i].id, 'displayOrder': i},
          ],
        },
        fromJson: (json) => json as Map<String, dynamic>,
      );
      ref.invalidate(homepageProvider);
    } catch (e) {
      if (mounted) _snack(e is ApiException ? e.message : 'Could not reorder sections');
    }
  }

  Future<void> _deleteSection(HomepageSection section) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete “${section.displayTitle}”?'),
        content: const Text('It will be removed from the storefront home page.'),
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
      await api.delete('/admin/homepage/sections/${section.id}');
      ref.invalidate(homepageProvider);
    } catch (e) {
      if (mounted) _snack(e is ApiException ? e.message : 'Delete failed');
    }
  }

  Future<void> _openSectionForm(HomepageResponse resp, {HomepageSection? section}) async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (_) => _SectionDialog(
        section: section,
        defaultOrder: section?.displayOrder ?? resp.sections.length,
      ),
    );
    if (saved == true) ref.invalidate(homepageProvider);
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: SreeponAdminTheme.red600),
    );
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(homepageProvider);

    return Scaffold(
      body: SafeArea(
        child: async.when(
          data: (resp) {
            _hydrate(resp);
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(homepageProvider),
              child: ListView(
                padding: const EdgeInsets.only(bottom: 96),
                children: [
                  SectionHeader(
                    title: 'Homepage',
                    subtitle: 'Hero copy and storefront sections',
                    trailing: IconButton(
                      icon: const Icon(Icons.refresh),
                      tooltip: 'Refresh',
                      onPressed: () => ref.invalidate(homepageProvider),
                    ),
                  ),
                  _heroCard(resp),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                    child: Row(
                      children: [
                        const Expanded(
                          child: Text('Sections',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        ),
                        Text('${resp.sections.length}',
                            style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
                      ],
                    ),
                  ),
                  if (resp.sections.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(16),
                      child: EmptyState(
                        title: 'No sections yet.',
                        subtitle: 'Add a section such as Trending products or Today’s offers.',
                        icon: Icons.web_outlined,
                      ),
                    )
                  else
                    ...List.generate(resp.sections.length, (index) {
                      final section = resp.sections[index];
                      return _sectionCard(
                        section,
                        index: index,
                        total: resp.sections.length,
                        sections: resp.sections,
                      );
                    }),
                ],
              ),
            );
          },
          loading: () => const Spinner(label: 'Loading homepage…'),
          error: (e, _) => ErrorState(
            message: e is ApiException ? e.message : 'Failed to load homepage',
            onRetry: () => ref.invalidate(homepageProvider),
          ),
        ),
      ),
      floatingActionButton: async.valueOrNull == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openSectionForm(async.valueOrNull!),
              icon: const Icon(Icons.add),
              label: const Text('Add section'),
            ),
    );
  }

  Widget _heroCard(HomepageResponse resp) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Hero copy',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text('Optional headline shown above the storefront sections.',
                style: TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
            const SizedBox(height: 12),
            TextField(
              controller: _heroTitle,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Hero title',
                hintText: 'Festival crackers, delivered safely',
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _heroTagline,
              textCapitalization: TextCapitalization.sentences,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Hero tagline',
                hintText: 'Licensed stock · 24–48h dispatch · GST invoice',
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 44,
              child: FilledButton(
                onPressed: _savingHero ? null : () => _saveHero(resp),
                child: _savingHero
                    ? const SizedBox(
                        width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Save hero copy'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionCard(
    HomepageSection section, {
    required int index,
    required int total,
    required List<HomepageSection> sections,
  }) {
    final config = section.config ?? const <String, dynamic>{};
    final limit = config['limit'];
    final productIds = config['productIds'] is List ? (config['productIds'] as List) : const [];
    final summary = [
      if (limit is num) 'limit ${limit.toInt()}',
      if (productIds.isNotEmpty) '${productIds.length} product(s)',
    ].join(' · ');

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 8, 4, 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                IconButton(
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(Icons.keyboard_arrow_up, size: 20),
                  tooltip: 'Move up',
                  onPressed: index == 0 ? null : () => _moveSection(sections, index, -1),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(Icons.keyboard_arrow_down, size: 20),
                  tooltip: 'Move down',
                  onPressed: index == total - 1 ? null : () => _moveSection(sections, index, 1),
                ),
              ],
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(section.displayTitle,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(
                    [section.type.label, if (summary.isNotEmpty) summary].join(' · '),
                    style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500),
                  ),
                  const SizedBox(height: 6),
                  StatusChip(
                    text: section.isActive ? 'Active' : 'Inactive',
                    tone: section.isActive ? 'green' : 'slate',
                  ),
                ],
              ),
            ),
            Column(
              children: [
                Switch(
                  value: section.isActive,
                  onChanged: (_) => _toggleSection(section),
                  activeThumbColor: SreeponAdminTheme.flame600,
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 20),
                      tooltip: 'Edit',
                      onPressed: () => _openSectionForm(_lastResponse!, section: section),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 20, color: SreeponAdminTheme.red600),
                      tooltip: 'Delete',
                      onPressed: () => _deleteSection(section),
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

  /// Latest loaded snapshot, used by the edit button in the section rows.
  HomepageResponse? get _lastResponse => ref.read(homepageProvider).valueOrNull;
}

class _SectionDialog extends StatefulWidget {
  const _SectionDialog({required this.defaultOrder, this.section});

  final HomepageSection? section;
  final int defaultOrder;

  @override
  State<_SectionDialog> createState() => _SectionDialogState();
}

class _SectionDialogState extends State<_SectionDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _title;
  late final TextEditingController _limit;
  late final TextEditingController _displayOrder;

  late HomepageSectionType _type;
  late bool _isActive;
  late List<String> _productIds;
  final Map<String, String> _productNames = {};
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final section = widget.section;
    final config = section?.config ?? const <String, dynamic>{};
    _type = section?.type ?? HomepageSectionType.trendingProducts;
    _title = TextEditingController(text: section?.title ?? '');
    _limit = TextEditingController(
      text: config['limit'] is num ? (config['limit'] as num).toInt().toString() : '8',
    );
    _displayOrder = TextEditingController(
      text: (section?.displayOrder ?? widget.defaultOrder).toString(),
    );
    _isActive = section?.isActive ?? true;
    _productIds = config['productIds'] is List
        ? (config['productIds'] as List).whereType<String>().toList()
        : <String>[];
    if (config['productNames'] is Map) {
      (config['productNames'] as Map).forEach((key, value) {
        if (key is String && value is String) _productNames[key] = value;
      });
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _limit.dispose();
    _displayOrder.dispose();
    super.dispose();
  }

  Future<void> _pickProducts() async {
    final picked = await showDialog<List<String>>(
      context: context,
      builder: (_) => _ProductPickerDialog(initial: _productIds, names: _productNames),
    );
    if (picked == null) return;
    setState(() => _productIds = picked);
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_type.requiresProductIds && _productIds.isEmpty) {
      setState(() => _error = 'Pick at least one product for this section.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    final config = <String, dynamic>{
      ...?widget.section?.config,
      if (_type.supportsLimit) 'limit': int.tryParse(_limit.text.trim()) ?? 8,
      if (_type.requiresProductIds) 'productIds': _productIds,
      if (_type.requiresProductIds) 'productNames': _productNames,
    };
    // Drop limit from types that no longer accept it.
    if (!_type.supportsLimit) config.remove('limit');
    if (!_type.requiresProductIds) {
      config.remove('productIds');
      config.remove('productNames');
    }

    final payload = <String, dynamic>{
      'type': _type.value,
      'title': _title.text.trim(),
      'config': config,
      'displayOrder': int.tryParse(_displayOrder.text.trim()) ?? 0,
      'isActive': _isActive,
    };

    try {
      if (widget.section == null) {
        await api.post<Map<String, dynamic>>(
          path: '/admin/homepage/sections',
          body: payload,
          fromJson: (json) => json as Map<String, dynamic>,
        );
      } else {
        await api.patch<Map<String, dynamic>>(
          path: '/admin/homepage/sections/${widget.section!.id}',
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
    return AlertDialog(
      title: Text(widget.section == null ? 'Add section' : 'Edit section'),
      content: SizedBox(
        width: double.maxFinite,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<HomepageSectionType>(
                  initialValue: _type,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: HomepageSectionType.values
                      .map((type) => DropdownMenuItem(
                            value: type,
                            child: Text(type.label, overflow: TextOverflow.ellipsis),
                          ))
                      .toList(),
                  onChanged: (value) => setState(() => _type = value ?? _type),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _title,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    labelText: 'Title',
                    hintText: 'Leave blank for the default heading',
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    if (_type.supportsLimit) ...[
                      Expanded(
                        child: TextFormField(
                          controller: _limit,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Limit'),
                        ),
                      ),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      child: TextFormField(
                        controller: _displayOrder,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Display order'),
                      ),
                    ),
                  ],
                ),
                if (_type.requiresProductIds) ...[
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _saving ? null : _pickProducts,
                    icon: const Icon(Icons.checklist),
                    label: Text('Choose products (${_productIds.length})'),
                  ),
                  if (_productIds.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: [
                          for (var i = 0; i < _productIds.length; i++)
                            Chip(
                              label: Text(
                                '${i + 1}. ${_productNames[_productIds[i]] ?? _productIds[i].substring(0, 8)}',
                              ),
                            ),
                        ],
                      ),
                    ),
                ],
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _isActive,
                  onChanged: (v) => setState(() => _isActive = v),
                  activeThumbColor: SreeponAdminTheme.flame600,
                  title: const Text('Active on the storefront'),
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
              : Text(widget.section == null ? 'Create' : 'Save'),
        ),
      ],
    );
  }
}

/// Handpicked product list for carousel/collection sections.
class _ProductPickerDialog extends StatefulWidget {
  const _ProductPickerDialog({required this.initial, required this.names});

  final List<String> initial;
  final Map<String, String> names;

  @override
  State<_ProductPickerDialog> createState() => _ProductPickerDialogState();
}

class _ProductPickerDialogState extends State<_ProductPickerDialog> {
  final _search = TextEditingController();
  late List<String> _selected;
  List<Product> _products = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selected = [...widget.initial];
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await api.get<Map<String, dynamic>>(
        '/admin/products',
        query: {'page': 1, 'limit': 100, if (_search.text.trim().isNotEmpty) 'q': _search.text.trim()},
        fromJson: (json) => json as Map<String, dynamic>,
      );
      final response = ProductListResponse.fromJson(data);
      if (!mounted) return;
      setState(() {
        _products = response.items;
        for (final product in response.items) {
          widget.names.putIfAbsent(product.id, () => product.name);
        }
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : 'Failed to load products';
      });
    }
  }

  void _toggle(Product product) {
    setState(() {
      if (_selected.contains(product.id)) {
        _selected.remove(product.id);
      } else {
        _selected.add(product.id);
        widget.names[product.id] = product.name;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Choose products'),
      content: SizedBox(
        width: double.maxFinite,
        height: 420,
        child: Column(
          children: [
            TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(
                hintText: 'Search products…',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
              onSubmitted: (_) => _load(),
            ),
            const SizedBox(height: 8),
            if (_selected.isNotEmpty)
              Align(
                alignment: Alignment.centerLeft,
                child: Text('${_selected.length} selected · tap again to remove',
                    style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
              ),
            Expanded(
              child: _loading
                  ? const Spinner(label: 'Loading products…')
                  : _error != null
                      ? ErrorState(message: _error!, onRetry: _load)
                      : _products.isEmpty
                          ? const EmptyState(title: 'No products match.')
                          : ListView.builder(
                              itemCount: _products.length,
                              itemBuilder: (context, index) {
                                final product = _products[index];
                                final position = _selected.indexOf(product.id);
                                return CheckboxListTile(
                                  dense: true,
                                  value: position >= 0,
                                  onChanged: (_) => _toggle(product),
                                  title: Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis),
                                  subtitle: Text(product.sku ?? ''),
                                  secondary: position >= 0
                                      ? CircleAvatar(
                                          radius: 12,
                                          backgroundColor: SreeponAdminTheme.flame50,
                                          child: Text('${position + 1}',
                                              style: const TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700,
                                                  color: SreeponAdminTheme.flame600)),
                                        )
                                      : null,
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(null), child: const Text('Cancel')),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_selected),
          child: const Text('Done'),
        ),
      ],
    );
  }
}
