import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:sreepon_admin/core/models/orders.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

final ordersProvider = FutureProvider<OrderListResponse>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/orders',
    query: {'page': 1, 'limit': 20},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return OrderListResponse.fromJson(data);
});

final orderDetailProvider = FutureProvider.family<Order, String>((ref, orderId) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/orders/$orderId',
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return Order.fromJson(data);
});

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(ordersProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: SectionHeader(
              title: 'Orders',
              subtitle: 'Manage and update order status',
              trailing: IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => ref.refresh(ordersProvider),
              ),
            ),
          ),
          async.when(
            data: (resp) => _buildList(context, resp),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load orders',
                onRetry: () => ref.refresh(ordersProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(BuildContext context, OrderListResponse resp) {
    if (resp.items.isEmpty) {
      return const SliverFillRemaining(
        child: EmptyState(title: 'No orders yet.', icon: Icons.receipt_outlined),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final order = resp.items[index];
          return _OrderRow(order: order);
        },
        childCount: resp.items.length,
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  const _OrderRow({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final paid = order.paymentStatus == 'PAID';
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: ListTile(
        leading: CircleAvatar(
          child: Text(order.orderNumber.substring(order.orderNumber.length - 4)),
        ),
        title: Text(order.orderNumber, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(formatDate(order.createdAt), style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(formatMoney(order.grandTotal),
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: 4),
            StatusChip(text: titleCase(order.paymentStatus ?? ''), tone: paid ? 'green' : 'amber'),
            StatusChip(text: titleCase(order.status ?? ''), tone: 'slate'),
          ],
        ),
        onTap: () => GoRouter.of(context).push('/orders/${order.id}'),
      ),
    );
  }
}
