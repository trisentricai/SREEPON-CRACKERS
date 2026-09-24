import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/storefront.dart';
import '../../auth/application/auth_controller.dart';
import '../../products/presentation/product_detail_screen.dart';
import 'order_detail_screen.dart';

/// Orders tab: paginated list of the current customer's orders. Auth-gated.
class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  int _page = 1;
  final ScrollController _scroll = ScrollController();

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Orders')),
        body: SriPonEmptyState(
          icon: Icons.receipt_long_outlined,
          title: 'Sign in required',
          message: 'Sign in to view your orders.',
          action: FilledButton(
            onPressed: () => Navigator.of(context).pushNamed('/profile'),
            child: const Text('Sign in'),
          ),
        ),
      );
    }

    final orders = ref.watch(ordersProvider(_page));
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: orders.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(ordersProvider(_page)),
        ),
        data: (response) {
          if (response.items.isEmpty) {
            return const SriPonEmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No orders yet',
              message: 'Your placed orders will show up here.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(ordersProvider(_page));
              await ref.read(ordersProvider(_page).future);
            },
            child: ListView.separated(
              controller: _scroll,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: response.items.length + 1,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                if (index == response.items.length) {
                  if (_page >= response.pagination.pages) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Center(
                      child: OutlinedButton(
                        onPressed: () => setState(() => _page += 1),
                        child: const Text('Load more'),
                      ),
                    ),
                  );
                }
                final order = response.items[index];
                return _OrderTile(
                  order: order,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => OrderDetailScreen(orderId: order.id),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  const _OrderTile({required this.order, required this.onTap});

  final Order order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '#${order.orderNumber}',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  StatusChip(label: order.status.wire),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${order.items.length} item${order.items.length == 1 ? '' : 's'} · ${formatDateTime(order.createdAt)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    formatMoney(order.grandTotal),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  Text(
                    formatUnit(order.paymentStatus.wire),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Reused by order detail "view product" navigation.
void openProduct(BuildContext context, String? slug) {
  if (slug == null || slug.isEmpty) return;
  Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (_) => ProductDetailScreen(slug: slug)),
  );
}
