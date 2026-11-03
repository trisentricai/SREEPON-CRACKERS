import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/inventory.dart';
import 'package:sreepon_admin/core/models/orders.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

/// Current inventory search term (debounced by the screen).
final inventoryQueryProvider = StateProvider<String>((ref) => '');

/// When true only items at or below their low-stock threshold are shown.
final inventoryLowStockOnlyProvider = StateProvider<bool>((ref) => false);

final inventoryProvider = FutureProvider.autoDispose<InventoryListResponse>((ref) async {
  final query = ref.watch(inventoryQueryProvider).trim();
  final lowOnly = ref.watch(inventoryLowStockOnlyProvider);

  if (lowOnly) {
    final data = await api.get<Map<String, dynamic>>(
      '/admin/inventory/low-stock',
      fromJson: (json) => json as Map<String, dynamic>,
    );
    final items = ((data['items'] as List<dynamic>?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(InventoryItem.fromJson)
        .where((item) => query.isEmpty ||
            (item.displayName.toLowerCase().contains(query.toLowerCase())) ||
            ((item.sku ?? '').toLowerCase().contains(query.toLowerCase())))
        .toList();
    return InventoryListResponse(
      items: items,
      pagination: Pagination(page: 1, limit: items.length, total: items.length, pages: 1),
    );
  }

  final data = await api.get<Map<String, dynamic>>(
    '/admin/inventory',
    query: {'page': 1, 'limit': 100, if (query.isNotEmpty) 'q': query},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return InventoryListResponse.fromJson(data);
});

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  final _search = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) ref.read(inventoryQueryProvider.notifier).state = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(inventoryProvider);
    final lowOnly = ref.watch(inventoryLowStockOnlyProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SectionHeader(
              title: 'Inventory',
              subtitle: 'Stock levels, adjustments and history',
              trailing: IconButton(
                icon: const Icon(Icons.refresh),
                tooltip: 'Refresh',
                onPressed: () => ref.invalidate(inventoryProvider),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _search,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Search by product or SKU…',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _search.text.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _search.clear();
                            ref.read(inventoryQueryProvider.notifier).state = '';
                            setState(() {});
                          },
                        ),
                ),
                onChanged: (value) {
                  setState(() {});
                  _onSearchChanged(value);
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  FilterChip(
                    label: const Text('Low stock only'),
                    selected: lowOnly,
                    onSelected: (selected) =>
                        ref.read(inventoryLowStockOnlyProvider.notifier).state = selected,
                  ),
                  const SizedBox(width: 8),
                  if (lowOnly)
                    TextButton.icon(
                      onPressed: () => ref.read(inventoryLowStockOnlyProvider.notifier).state = false,
                      icon: const Icon(Icons.close, size: 16),
                      label: const Text('Clear filter'),
                    ),
                ],
              ),
            ),
            Expanded(
              child: async.when(
                data: (resp) => _buildList(context, ref, resp),
                loading: () => const Spinner(label: 'Loading inventory…'),
                error: (e, _) => ErrorState(
                  message: e is ApiException ? e.message : 'Failed to load inventory',
                  onRetry: () => ref.invalidate(inventoryProvider),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildList(BuildContext context, WidgetRef ref, InventoryListResponse resp) {
    if (resp.items.isEmpty) {
      return EmptyState(
        title: ref.watch(inventoryLowStockOnlyProvider)
            ? 'No low-stock items.'
            : 'No inventory items found.',
        subtitle: 'Create a product first — every product gets a stock row.',
        icon: Icons.inventory_2_outlined,
        action: () => ref.invalidate(inventoryProvider),
        actionLabel: 'Refresh',
      );
    }

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(inventoryProvider),
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: 96),
        itemCount: resp.items.length,
        itemBuilder: (context, index) {
          final item = resp.items[index];
          return _InventoryRow(
            item: item,
            onAdjust: () => _showAdjustSheet(context, ref, item),
            onHistory: () => _showHistoryDialog(context, ref, item),
          );
        },
      ),
    );
  }

  Future<void> _showAdjustSheet(BuildContext context, WidgetRef ref, InventoryItem item) async {
    final deltaController = TextEditingController();
    final noteController = TextEditingController();
    var reason = 'STOCK_IN';
    var submitting = false;
    String? error;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> submit() async {
              final delta = int.tryParse(deltaController.text.trim());
              if (delta == null || delta == 0) {
                setSheetState(() => error = 'Enter a non-zero whole number (e.g. 10 or -5)');
                return;
              }
              setSheetState(() {
                submitting = true;
                error = null;
              });
              try {
                await api.post<Map<String, dynamic>>(
                  path: '/admin/inventory/${item.productId}/adjust',
                  body: {
                    'delta': delta,
                    'reason': reason,
                    if (noteController.text.trim().isNotEmpty) 'note': noteController.text.trim(),
                  },
                  fromJson: (json) => json as Map<String, dynamic>,
                );
                if (!sheetContext.mounted) return;
                Navigator.of(sheetContext).pop();
                ref.invalidate(inventoryProvider);
                if (mounted) {
                  ScaffoldMessenger.of(this.context).showSnackBar(
                    SnackBar(
                      content: Text('Stock updated by ${delta > 0 ? '+' : ''}$delta'),
                      backgroundColor: SreeponAdminTheme.green600,
                    ),
                  );
                }
              } catch (e) {
                setSheetState(() {
                  submitting = false;
                  error = e is ApiException ? e.message : 'Adjustment failed';
                });
              }
            }

            final bottomInset = MediaQuery.of(context).viewInsets.bottom;
            return Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomInset),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(item.displayName,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text('SKU ${item.sku ?? '—'} · ${item.available} available',
                        style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
                    const SizedBox(height: 16),
                    TextField(
                      controller: deltaController,
                      autofocus: true,
                      keyboardType: const TextInputType.numberWithOptions(signed: true),
                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^-?\d*'))],
                      decoration: const InputDecoration(
                        labelText: 'Quantity change *',
                        hintText: 'Positive to add, negative to remove',
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [1, 5, 10, 25, -1, -5].map((delta) {
                        return ActionChip(
                          label: Text('${delta > 0 ? '+' : ''}$delta'),
                          onPressed: () {
                            final current = int.tryParse(deltaController.text.trim()) ?? 0;
                            deltaController.text = (current + delta).toString();
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: reason,
                      decoration: const InputDecoration(labelText: 'Reason'),
                      items: const [
                        DropdownMenuItem(value: 'STOCK_IN', child: Text('Stock in')),
                        DropdownMenuItem(value: 'RECOUNT', child: Text('Recount / correction')),
                        DropdownMenuItem(value: 'RETURN', child: Text('Customer return')),
                        DropdownMenuItem(value: 'DAMAGE', child: Text('Damage / breakage')),
                        DropdownMenuItem(value: 'CANCELLATION', child: Text('Order cancellation')),
                        DropdownMenuItem(value: 'OTHER', child: Text('Other')),
                      ],
                      onChanged: (value) => setSheetState(() => reason = value ?? reason),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: noteController,
                      maxLength: 500,
                      decoration: const InputDecoration(labelText: 'Note (optional)'),
                    ),
                    if (error != null) ...[
                      const SizedBox(height: 4),
                      Text(error!, style: const TextStyle(color: SreeponAdminTheme.red600)),
                    ],
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 48,
                      child: FilledButton(
                        onPressed: submitting ? null : submit,
                        child: submitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Update stock'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _showHistoryDialog(BuildContext context, WidgetRef ref, InventoryItem item) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text('${item.displayName} · history'),
          content: SizedBox(
            width: double.maxFinite,
            height: 360,
            child: FutureBuilder<InventoryTransactionsResponse>(
              future: api.get<Map<String, dynamic>>(
                '/admin/inventory/${item.productId}/transactions',
                query: {'page': 1, 'limit': 50},
                fromJson: (json) => json as Map<String, dynamic>,
              ).then(InventoryTransactionsResponse.fromJson),
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Spinner();
                }
                if (snapshot.hasError) {
                  return ErrorState(
                    message: snapshot.error is ApiException
                        ? (snapshot.error as ApiException).message
                        : 'Failed to load history',
                  );
                }
                final items = snapshot.data?.items ?? const <InventoryTransaction>[];
                if (items.isEmpty) {
                  return const EmptyState(title: 'No stock movements yet.');
                }
                return ListView.separated(
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final tx = items[index];
                    final positive = tx.delta >= 0;
                    return ListTile(
                      dense: true,
                      leading: Icon(
                        positive ? Icons.add_circle_outline : Icons.remove_circle_outline,
                        color: positive ? SreeponAdminTheme.green600 : SreeponAdminTheme.red600,
                      ),
                      title: Text('${positive ? '+' : ''}${tx.delta} · ${titleCase(tx.type)}'),
                      subtitle: Text(
                        [
                          if (tx.note != null && tx.note!.isNotEmpty) tx.note!,
                          if (tx.adminName != null) 'by ${tx.adminName}',
                          formatDateTime(tx.createdAt),
                        ].join(' · '),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(dialogContext).pop(), child: const Text('Close')),
          ],
        );
      },
    );
  }
}

class _InventoryRow extends StatelessWidget {
  const _InventoryRow({required this.item, required this.onAdjust, required this.onHistory});

  final InventoryItem item;
  final VoidCallback onAdjust;
  final VoidCallback onHistory;

  @override
  Widget build(BuildContext context) {
    final tone = item.isOutOfStock ? 'red' : (item.isLowStock ? 'amber' : 'green');
    final label = item.isOutOfStock ? 'Out of stock' : (item.isLowStock ? 'Low stock' : 'In stock');
    final sku = item.sku ?? '';
    final avatarText = sku.isNotEmpty ? sku.substring(sku.length >= 3 ? sku.length - 3 : 0) : '?';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: SreeponAdminTheme.flame50,
              child: Text(avatarText,
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: SreeponAdminTheme.flame600)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.displayName,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text('SKU ${sku.isEmpty ? '—' : sku}${item.unit != null ? ' · ${item.unit}' : ''}',
                      style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 12,
                    runSpacing: 2,
                    children: [
                      Text('${item.available} available',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      Text('Total ${item.quantity}',
                          style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
                      if (item.reservedQuantity > 0)
                        Text('Reserved ${item.reservedQuantity}',
                            style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
                      Text('Alert ≤ ${item.lowStockThreshold}',
                          style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  StatusChip(text: label, tone: tone),
                ],
              ),
            ),
            Column(
              children: [
                IconButton(
                  icon: const Icon(Icons.add_box_outlined, color: SreeponAdminTheme.flame600),
                  tooltip: 'Adjust stock',
                  onPressed: onAdjust,
                ),
                IconButton(
                  icon: const Icon(Icons.history, color: SreeponAdminTheme.slate500),
                  tooltip: 'History',
                  onPressed: onHistory,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
