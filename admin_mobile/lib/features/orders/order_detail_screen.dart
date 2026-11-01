import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:sreepon_admin/core/models/orders.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'orders_screen.dart' show orderDetailProvider;
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

final orderStatusUpdateProvider = FutureProvider.family<Order, Map<String, String>>((ref, args) async {
  final orderId = args['orderId']!;
  final status = args['status']!;
  final data = await api.patch<Map<String, dynamic>>(
    path: '/admin/orders/$orderId/status',
    body: {'status': status},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return Order.fromJson(data);
});

final orderPaymentStatusUpdateProvider = FutureProvider.family<Order, Map<String, String>>((ref, args) async {
  final orderId = args['orderId']!;
  final paymentStatus = args['paymentStatus']!;
  final data = await api.patch<Map<String, dynamic>>(
    path: '/admin/orders/$orderId/payment-status',
    body: {'paymentStatus': paymentStatus},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return Order.fromJson(data);
});

final orderNoteAddProvider = FutureProvider.family<void, Map<String, String>>((ref, args) async {
  final orderId = args['orderId']!;
  final note = args['note']!;
  await api.post<Map<String, dynamic>>(
    path: '/admin/orders/$orderId/notes',
    body: {'note': note},
    fromJson: (_) => <String, dynamic>{},
  );
});

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  final _noteController = TextEditingController();

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  String _statusBadgeTone(String? status) {
    switch (status) {
      case 'PAID':
      case 'DELIVERED':
        return 'green';
      case 'PENDING':
      case 'CONFIRMED':
        return 'amber';
      case 'CANCELLED':
      case 'RETURNED':
        return 'red';
      default:
        return 'slate';
    }
  }

  String _paymentBadgeTone(String? status) {
    switch (status) {
      case 'PAID':
        return 'green';
      case 'PENDING':
        return 'amber';
      case 'FAILED':
        return 'red';
      case 'REFUNDED':
        return 'slate';
      default:
        return 'slate';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) {
        final orderAsync = ref.watch(orderDetailProvider(widget.orderId));

        return Scaffold(
          appBar: AppBar(title: Text('Order ${widget.orderId.substring(0, 8)}')),
          body: orderAsync.when(
            data: (order) => _buildDetail(context, order, ref),
            loading: () => const Center(child: Spinner()),
            error: (e, _) => ErrorState(
              message: e is ApiException ? e.message : 'Failed to load order',
              onRetry: () => ref.refresh(orderDetailProvider(widget.orderId)),
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetail(BuildContext context, Order order, WidgetRef ref) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(order.orderNumber,
                                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                      fontWeight: FontWeight.w700,
                                      color: SreeponAdminTheme.slate900,
                                    )),
                            const SizedBox(height: 4),
                            Text(formatDate(order.createdAt),
                                style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(formatMoney(order.grandTotal),
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: SreeponAdminTheme.flame600,
                              )),
                          const SizedBox(height: 4),
                          Text(order.currency ?? 'INR',
                              style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: StatusChip(
                          text: titleCase(order.status ?? '—'),
                          tone: _statusBadgeTone(order.status),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: StatusChip(
                          text: titleCase(order.paymentStatus ?? '—'),
                          tone: _paymentBadgeTone(order.paymentStatus),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Order status',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: SreeponAdminTheme.slate900)),
                  const SizedBox(height: 12),
                  _statusRow(ref, order, 'PENDING', 'Pending'),
                  _statusRow(ref, order, 'CONFIRMED', 'Confirmed'),
                  _statusRow(ref, order, 'DELIVERED', 'Delivered'),
                  _statusRow(ref, order, 'CANCELLED', 'Cancelled'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Payment status',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: SreeponAdminTheme.slate900)),
                  const SizedBox(height: 12),
                  _paymentStatusRow(ref, order, 'PENDING', 'Pending'),
                  _paymentStatusRow(ref, order, 'PAID', 'Paid'),
                  _paymentStatusRow(ref, order, 'FAILED', 'Failed'),
                  _paymentStatusRow(ref, order, 'REFUNDED', 'Refunded'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (order.customer != null || order.address != null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Customer & delivery',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: SreeponAdminTheme.slate900)),
                    const SizedBox(height: 12),
                    if (order.customer != null) ...[
                      ListTile(
                        leading: const Icon(Icons.person_outlined, size: 24),
                        title: Text(order.customer!['name'] ?? 'Customer',
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text(order.customer!['email'] ?? ''),
                      ),
                    ],
                    if (order.address != null) ...[
                      ListTile(
                        leading: const Icon(Icons.location_on_outlined, size: 24),
                        title: Text('${order.address!['line1'] ?? ''} ${order.address!['line2'] ?? ''}'.trim(),
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text(
                          '${order.address!['city'] ?? ''}, ${order.address!['state'] ?? ''} ${order.address!['pincode'] ?? ''}',
                          style: const TextStyle(fontSize: 13, color: SreeponAdminTheme.slate600),
                        ),
                        trailing: Text(order.address!['phone'] ?? '', style: const TextStyle(fontSize: 12)),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Items',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: SreeponAdminTheme.slate900)),
                  const SizedBox(height: 12),
                  ...(order.items ?? []).map((item) => ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.inventory_outlined, size: 16)),
                    title: Text(item.productName ?? item.productId, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('SKU: ${item.sku ?? '-'} × ${item.quantity} ${item.unit ?? ''}',
                        style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate600)),
                    trailing: Text(formatMoney(item.lineTotal),
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                  )),
                  const Divider(),
                  Row(
                    children: [
                      const Spacer(),
                      const Text('Total', style: TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(width: 12),
                      Text(formatMoney(order.grandTotal),
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: SreeponAdminTheme.flame600)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (order.notes != null && order.notes!.isNotEmpty) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Notes',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: SreeponAdminTheme.slate900)),
                    const SizedBox(height: 8),
                    Text(order.notes!, style: const TextStyle(fontSize: 13, color: SreeponAdminTheme.slate700)),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Add note',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: SreeponAdminTheme.slate900)),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _noteController,
                    decoration: const InputDecoration(
                      labelText: 'Note',
                      hintText: 'Add an internal note for this order',
                    ),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 40,
                    child: OutlinedButton(
                      onPressed: _noteController.text.isEmpty
                          ? null
                          : () async {
                              await ref.read(orderNoteAddProvider({
                                'orderId': widget.orderId,
                                'note': _noteController.text,
                              }).future);
                              _noteController.clear();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text('Note added'), backgroundColor: SreeponAdminTheme.green600),
                                );
                                ref.refresh(orderDetailProvider(widget.orderId));
                              }
                            },
                      child: const Text('Add'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusRow(WidgetRef ref, Order order, String newStatus, String label) {
    final already = order.status == newStatus;
    return ListTile(
      title: Text(label, style: TextStyle(color: already ? SreeponAdminTheme.slate500 : null)),
      trailing: already
          ? const Text('Current', style: TextStyle(fontSize: 11, color: SreeponAdminTheme.slate500))
          : OutlinedButton(
              onPressed: () async {
                await ref.read(orderStatusUpdateProvider({
                  'orderId': widget.orderId,
                  'status': newStatus,
                }).future);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text('Status set to $label'), backgroundColor: SreeponAdminTheme.green600),
                  );
                  ref.refresh(orderDetailProvider(widget.orderId));
                }
              },
              child: const Text('Set'),
            ),
    );
  }

  Widget _paymentStatusRow(WidgetRef ref, Order order, String newStatus, String label) {
    final already = order.paymentStatus == newStatus;
    return ListTile(
      title: Text(label, style: TextStyle(color: already ? SreeponAdminTheme.slate500 : null)),
      trailing: already
          ? const Text('Current', style: TextStyle(fontSize: 11, color: SreeponAdminTheme.slate500))
          : OutlinedButton(
              onPressed: () async {
                await ref.read(orderPaymentStatusUpdateProvider({
                  'orderId': widget.orderId,
                  'paymentStatus': newStatus,
                }).future);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Payment set to $label'), backgroundColor: SreeponAdminTheme.green600),
                  );
                  ref.refresh(orderDetailProvider(widget.orderId));
                }
              },
              child: const Text('Set'),
            ),
    );
  }
}
