import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/inventory.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

final inventoryProvider = FutureProvider<InventoryListResponse>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/inventory',
    query: {'page': 1, 'limit': 20},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return InventoryListResponse.fromJson(data);
});

class InventoryScreen extends ConsumerWidget {
  const InventoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(inventoryProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: SectionHeader(
              title: 'Inventory',
              subtitle: 'Stock levels and thresholds',
              trailing: IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.refresh(inventoryProvider)),
            ),
          ),
          async.when(
            data: (resp) => _buildList(context, resp),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load inventory',
                onRetry: () => ref.refresh(inventoryProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(BuildContext context, InventoryListResponse resp) {
    if (resp.items.isEmpty) {
      return const SliverFillRemaining(
        child: EmptyState(title: 'No inventory items yet.', icon: Icons.inventory_outlined),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final item = resp.items[index];
          final low = item.isLowStock;
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: ListTile(
              leading: CircleAvatar(
                child: Text(item.sku?.substring(item.sku!.length - 3) ?? '?'),
              ),
              title: Text(item.productName ?? item.productId, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text('SKU: ${item.sku ?? '-'}', style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate600)),
                ],
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('${item.available} available', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  StatusChip(text: low ? 'Low stock' : 'OK', tone: low ? 'amber' : 'green'),
                ],
              ),
            ),
          );
        },
        childCount: resp.items.length,
      ),
    );
  }
}
