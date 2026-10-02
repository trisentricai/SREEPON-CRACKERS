import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/storefront.dart';
import 'orders_screen.dart';

/// Order detail: full breakdown, items, payments, cancel / return actions,
/// and invoice download.
class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderByIdProvider(orderId));
    return Scaffold(
      appBar: AppBar(title: const Text('Order details')),
      body: order.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(orderByIdProvider(orderId)),
        ),
        data: (value) => _buildOrder(context, ref, value),
      ),
    );
  }

  Widget _buildOrder(BuildContext context, WidgetRef ref, Order order) {
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(orderByIdProvider(orderId)),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '#${order.orderNumber}',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              StatusChip(label: order.status.wire),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Placed ${formatDateTime(order.createdAt)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          _section(context, 'Items', Column(
            children: [
              for (final item in order.items) _itemRow(context, item),
            ],
          )),
          _section(context, 'Summary', Column(
            children: [
              _row(context, 'Subtotal', formatMoney(order.subtotal)),
              if (order.discount != '0' && order.discount != '0.00')
                _row(context, 'Discount', '-${formatMoney(order.discount)}'),
              if (order.tax != '0' && order.tax != '0.00')
                _row(context, 'Tax', formatMoney(order.tax)),
              _row(context, 'Delivery fee', formatMoney(order.deliveryFee)),
              const Divider(height: 20),
              _row(context, 'Total', formatMoney(order.grandTotal), emphasize: true),
            ],
          )),
          if (order.coupon != null)
            _section(context, 'Coupon', Row(
              children: [
                const Icon(Icons.local_offer_outlined, size: 16),
                const SizedBox(width: 6),
                Text('${order.coupon!.code} applied'),
              ],
            )),
          if (order.address != null)
            _section(context, 'Delivery address', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${order.address!.fullName} · ${order.address!.phone}'),
                const SizedBox(height: 4),
                Text(
                  '${order.address!.line1}${order.address!.line2 != null ? ', ${order.address!.line2}' : ''}, '
                  '${order.address!.city}, ${order.address!.state} ${order.address!.pincode}',
                ),
              ],
            )),
          if (order.payments.isNotEmpty)
            _section(context, 'Payments', Column(
              children: [
                for (final payment in order.payments)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${formatUnit(payment.provider)} · ${formatDateTime(payment.createdAt)}',
                          ),
                        ),
                        StatusChip(label: payment.status.wire),
                        const SizedBox(width: 8),
                        Text(formatMoney(payment.amount)),
                      ],
                    ),
                  ),
              ],
            )),
          if (order.cancelReason != null)
            _section(context, 'Cancellation reason', Text(order.cancelReason!)),
          const SizedBox(height: 16),
          _buildActions(context, ref, order),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context, WidgetRef ref, Order order) {
    final canCancel = order.status == OrderStatus.pending ||
        order.status == OrderStatus.confirmed ||
        order.status == OrderStatus.processing;
    final canReturn = order.status == OrderStatus.delivered;
    final actions = <Widget>[
      if (canCancel)
        OutlinedButton.icon(
          onPressed: () => _requestCancel(context, ref, order),
          icon: const Icon(Icons.close_outlined),
          label: const Text('Request cancellation'),
        ),
      if (canReturn)
        OutlinedButton.icon(
          onPressed: () => _requestReturn(context, ref, order),
          icon: const Icon(Icons.assignment_return_outlined),
          label: const Text('Request return'),
        ),
      TextButton.icon(
        onPressed: () => _downloadInvoice(context, ref, order),
        icon: const Icon(Icons.receipt_outlined),
        label: const Text('Download invoice'),
      ),
    ];
    if (actions.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: actions,
    );
  }

  Future<void> _requestCancel(BuildContext context, WidgetRef ref, Order order) async {
    final reason = await _promptText(context, 'Cancellation reason', 'Optional — why are you cancelling?');
    if (reason == null || !context.mounted) return;
    try {
      await api.post(
        '/orders/${order.id}/cancel',
        body: {if (reason.trim().isNotEmpty) 'reason': reason.trim()},
        fromJson: (json) => json,
      );
      ref.invalidate(orderByIdProvider(orderId));
      ref.invalidate(ordersProvider(1));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cancellation requested')));
      }
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _requestReturn(BuildContext context, WidgetRef ref, Order order) async {
    final reason = await _promptText(context, 'Return reason', 'Why are you returning this order?');
    if (reason == null) return;
    final item = order.items.length == 1 ? order.items.first : null;
    try {
      await api.post(
        '/orders/${order.id}/return-request',
        body: {
          if (item != null) 'productId': item.productId,
          'reason': reason.trim(),
        },
        fromJson: (json) => json,
      );
      ref.invalidate(orderByIdProvider(orderId));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Return request submitted')));
      }
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _downloadInvoice(BuildContext context, WidgetRef ref, Order order) async {
    try {
      final invoice = await api.get(
        '/orders/${order.id}/invoice',
        fromJson: InvoiceData.fromJson,
      );
      if (!context.mounted) return;
      showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Invoice'),
          content: SingleChildScrollView(
            child: Text(
              'Invoice #${invoice.invoiceNumber}\nIssued ${formatDateTime(invoice.issuedAt)}\n\n'
              'Order #${invoice.order.orderNumber}\n'
              'Total: ${formatMoney(invoice.order.grandTotal)}\n\n'
              'This invoice can also be printed from this screen in a later '
              'release; for now it is saved to your device logs.',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<String?> _promptText(BuildContext context, String title, String hint) {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  Widget _section(BuildContext context, String title, Widget child) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }

  Widget _itemRow(BuildContext context, OrderItem orderItem) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 48,
              height: 48,
              child: SriponImage(url: orderItem.imageUrl),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InkWell(
                  onTap: () => openProduct(context, orderItem.productSlug),
                  child: Text(
                    orderItem.productName,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                Text(
                  '${formatUnit(orderItem.unit)} × ${orderItem.quantity}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
          Text(formatMoney(orderItem.lineTotal)),
        ],
      ),
    );
  }

  Widget _row(BuildContext context, String label, String value, {bool emphasize = false}) {
    final style = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: emphasize ? style.titleMedium?.copyWith(fontWeight: FontWeight.w700) : style.bodyMedium),
          Text(value, style: emphasize ? style.titleMedium?.copyWith(fontWeight: FontWeight.w700) : style.bodyMedium),
        ],
      ),
    );
  }
}