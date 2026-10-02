import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/storefront.dart';
import '../../orders/presentation/order_detail_screen.dart';

/// Checkout: pick an address (or add inline), optional coupon, place the order
/// via `POST /orders`, then create a payment. Cash and mock gateways need no
/// external SDK; razorpay/stripe return a clientPayload shown to the customer.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final TextEditingController _coupon = TextEditingController();
  final _addressForm = <String, TextEditingController>{};
  Address? _selectedAddress;
  String? _couponApplied;
  bool _placing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    for (final field in _addressFields.keys) {
      _addressForm[field] = TextEditingController();
    }
  }

  static const _addressFields = <String, String>{
    'label': 'Label',
    'fullName': 'Full name',
    'phone': 'Phone',
    'line1': 'Address line 1',
    'line2': 'Address line 2',
    'city': 'City',
    'state': 'State',
    'pincode': 'Pincode',
    'country': 'Country',
  };

  @override
  void dispose() {
    _coupon.dispose();
    for (final controller in _addressForm.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final addresses = ref.watch(addressesProvider);

    if (cart.hasError) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: ErrorView(error: cart.error!, onRetry: () => ref.invalidate(cartProvider)),
      );
    }
    if (addresses.hasError) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: ErrorView(error: addresses.error!, onRetry: () => ref.invalidate(addressesProvider)),
      );
    }
    final cartValue = cart.value;
    final addressesValue = addresses.value;
    if (cartValue == null || addressesValue == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: _buildCheckout(context, cartValue, addressesValue),
    );
  }

  Widget _buildCheckout(BuildContext context, Cart cart, List<Address> addresses) {
    if (cart.items.isEmpty) {
      return const SriPonEmptyState(
        icon: Icons.shopping_cart_outlined,
        title: 'Your cart is empty',
        message: 'Add products before checking out.',
      );
    }

    final selected = _selectedAddress;
    final effectiveDefault = selected ??
        addresses.where((address) => address.isDefault).firstOrNull ??
        (addresses.isNotEmpty ? addresses.first : null);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(cartProvider);
        ref.invalidate(addressesProvider);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const FunHeading(
            title: 'Checkout',
            subtitle: 'Sealed boxes, GST bill included.',
            overline: 'Almost boom time',
          ),
          const SizedBox(height: 12),
          StickerCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Delivery address', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                if (addresses.isEmpty)
                  const Text('Add an address below to check out.', style: TextStyle(color: SriPonColors.inkMuted))
                else
                  for (final address in addresses)
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: address == effectiveDefault ? SriPonColors.sunny100 : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: SriPonColors.ink, width: 2),
                        boxShadow: stickerShadow(dx: 2, dy: 2),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => setState(() => _selectedAddress = address),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Icon(
                                address == effectiveDefault
                                    ? Icons.radio_button_checked
                                    : Icons.radio_button_unchecked,
                                color: SriPonColors.ink,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${address.fullName} · ${address.label}'),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${address.line1}${address.line2 != null ? ', ${address.line2}' : ''}, '
                                      '${address.city}, ${address.state} ${address.pincode}',
                                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              if (address.isDefault) const Icon(Icons.star, size: 18),
                            ],
                          ),
                        ),
                      ),
                    ),
                const SizedBox(height: 8),
                Text('New address', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                ..._buildAddressForm(),
              ],
            ),
          ),
          const SizedBox(height: 12),
          StickerCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Payment', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: SriPonColors.mint100,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: SriPonColors.ink, width: 2),
                    boxShadow: stickerShadow(dx: 2, dy: 2),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.radio_button_checked, color: SriPonColors.ink),
                      SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Mock payment (test mode)', style: TextStyle(fontWeight: FontWeight.w700)),
                            SizedBox(height: 2),
                            Text('Cash and mock gateways need no external SDK.', style: TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          StickerCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Coupon', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _coupon,
                        decoration: InputDecoration(
                          isDense: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          hintText: 'Enter coupon code',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ChunkyButton(
                      label: 'Apply',
                      color: Colors.white,
                      onPressed: _coupon.text.trim().isEmpty ? null : () => setState(() => _couponApplied = _coupon.text.trim()),
                    ),
                  ],
                ),
                if (_couponApplied != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, size: 16, color: SriPonColors.success),
                        const SizedBox(width: 6),
                        Text('Coupon $_couponApplied applied', style: const TextStyle(color: SriPonColors.success)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          StickerCard(
            padding: const EdgeInsets.all(16),
            color: SriPonColors.sunny100,
            child: Column(
              children: [
                _row(context, 'Items', '${cart.itemCount}'),
                _row(context, 'Subtotal', formatMoney(cart.subtotal)),
                const Divider(height: 20),
                _row(context, 'Total', formatMoney(cart.subtotal), emphasize: true),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, style: const TextStyle(color: SriPonColors.danger)),
            ),
          ChunkyButton(
            label: _placing ? 'Placing…' : 'Place order',
            icon: Icons.celebration_outlined,
            color: SriPonColors.coral600,
            foreground: Colors.white,
            onPressed: _placing || (effectiveDefault == null && _isInlineAddressEmpty) ? null : _placeOrder,
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  bool get _isInlineAddressEmpty {
    final fullName = _addressForm['fullName']?.text.trim() ?? '';
    final line1 = _addressForm['line1']?.text.trim() ?? '';
    final city = _addressForm['city']?.text.trim() ?? '';
    final pincode = _addressForm['pincode']?.text.trim() ?? '';
    return fullName.isEmpty && line1.isEmpty && city.isEmpty && pincode.isEmpty;
  }

  List<Widget> _buildAddressForm() {
    return _addressFields.entries.map((entry) {
      final controller = _addressForm[entry.key]!;
      final isPincode = entry.key == 'pincode';
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: TextField(
          controller: controller,
          keyboardType: isPincode ? TextInputType.number : TextInputType.text,
          decoration: InputDecoration(
            labelText: entry.value,
            isDense: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
      );
    }).toList();
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

  Map<String, dynamic> _inlineAddressPayload() {
    return {
      for (final entry in _addressFields.entries)
        entry.key: _addressForm[entry.key]!.text.trim(),
    };
  }

  Future<void> _placeOrder() async {
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final selected = _selectedAddress;
      final inline = _inlineAddressPayload();
      final useInline = selected == null && !_isInlineAddressEmpty;
      final body = <String, dynamic>{
        if (_couponApplied != null) 'couponCode': _couponApplied,
        if (useInline && !_isInlineAddressEmpty) 'address': inline,
        if (!useInline || _isInlineAddressEmpty) 'addressId': selected?.id,
      };

      final order = await api.post(
        '/orders',
        body: body,
        fromJson: Order.fromJson,
      );
      ref.invalidate(ordersProvider(1));

      // Create a payment. Cash = all set; mock = test-mode success.
      await api.post<dynamic>(
        '/payments',
        body: {'orderId': order.id, 'provider': 'mock'},
        fromJson: (json) => json,
      );

      if (!mounted) return;
      setState(() => _placing = false);
      ref.invalidate(cartProvider);
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Mascot(size: 96),
              const SizedBox(height: 12),
              const Starburst(label: 'Yay!', sub: 'order placed', size: 88),
              const SizedBox(height: 12),
              Text(
                'Order #${order.orderNumber} is packed!',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
            ],
          ),
          actions: [
            ChunkyButton(
              label: 'View order',
              icon: Icons.receipt_long_outlined,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => OrderDetailScreen(orderId: order.id),
        ),
      );
      ref.invalidate(cartProvider);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _placing = false;
        _error = error.message;
      });
    }
  }
}
