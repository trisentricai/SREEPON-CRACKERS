import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/storefront.dart';
import '../../auth/application/auth_controller.dart';

/// Cart tab: current `/cart` with quantity steppers, remove, and the checkout
/// CTA. Auth-gated — prompts sign-in when there is no session.
class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Cart')),
        body: _SignInPrompt(onPressed: () => Navigator.of(context).pushNamed('/profile')),
      );
    }

    final cart = ref.watch(cartProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: cart.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(cartProvider),
        ),
        data: (value) {
          if (value.items.isEmpty) {
            return const _EmptyCart();
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(cartProvider),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                for (final item in value.items) _CartItemTile(item: item, cartId: value.id),
                const SizedBox(height: 16),
                Card(
                  elevation: 0,
                  color: Theme.of(context).colorScheme.surfaceContainerLow,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        _summaryRow(context, 'Subtotal', formatMoney(value.subtotal)),
                        _summaryRow(context, 'Items', '${value.totalQuantity}'),
                        const Divider(height: 24),
                        _summaryRow(context, 'Total', formatMoney(value.subtotal), emphasize: true),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: value.outOfStockCount > 0
                      ? null
                      : () => Navigator.of(context).pushNamed('/checkout'),
                  icon: const Icon(Icons.lock_outline),
                  label: Text(
                    value.outOfStockCount > 0
                        ? 'Remove out-of-stock items to continue'
                        : 'Checkout',
                  ),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => _clearCart(context, ref),
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Clear cart'),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _summaryRow(BuildContext context, String label, String value, {bool emphasize = false}) {
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

  Future<void> _clearCart(BuildContext context, WidgetRef ref) async {
    try {
      await api.delete('/cart');
      ref.invalidate(cartProvider);
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }
}

class _CartItemTile extends ConsumerWidget {
  const _CartItemTile({required this.item, required this.cartId});

  final CartItem item;
  final String cartId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 72,
                height: 72,
                child: SriponImage(url: item.product.imageUrl),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    formatUnit(item.unit.wire),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                  if (item.isOutOfStock)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Out of stock',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: SriPonColors.danger),
                      ),
                    ),
                  const SizedBox(height: 8),
                  PriceRow(basePrice: item.lineTotal),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      IconButton.outlined(
                        visualDensity: VisualDensity.compact,
                        icon: const Icon(Icons.remove, size: 18),
                        onPressed: item.quantity <= 1 || item.isOutOfStock
                            ? null
                            : () => _updateQuantity(ref, item.quantity - 1),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text('${item.quantity}', style: Theme.of(context).textTheme.titleSmall),
                      ),
                      IconButton.outlined(
                        visualDensity: VisualDensity.compact,
                        icon: const Icon(Icons.add, size: 18),
                        onPressed: item.quantity >= item.availableStock
                            ? null
                            : () => _updateQuantity(ref, item.quantity + 1),
                      ),
                      const Spacer(),
                      IconButton(
                        tooltip: 'Remove',
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => _removeItem(ref),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateQuantity(WidgetRef ref, int quantity) async {
    try {
      await api.patch(
        '/cart/items/${item.id}',
        body: {'quantity': quantity},
        fromJson: (json) => json,
      );
      ref.invalidate(cartProvider);
    } on ApiException catch (error) {
      _showError(ref, error.message);
    }
  }

  Future<void> _removeItem(WidgetRef ref) async {
    try {
      await api.delete('/cart/items/${item.id}');
      ref.invalidate(cartProvider);
    } on ApiException catch (error) {
      _showError(ref, error.message);
    }
  }

  void _showError(WidgetRef ref, String message) {
    ScaffoldMessenger.of(ref.context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _EmptyCart extends StatelessWidget {
  const _EmptyCart();

  @override
  Widget build(BuildContext context) {
    return const SriPonEmptyState(
      icon: Icons.shopping_cart_outlined,
      title: 'Your cart is empty',
      message: 'Browse the catalogue and add some crackers to get started.',
    );
  }
}

class _SignInPrompt extends StatelessWidget {
  const _SignInPrompt({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SriPonEmptyState(
      icon: Icons.lock_outline,
      title: 'Sign in required',
      message: 'Sign in to view your cart and check out.',
      action: FilledButton(onPressed: onPressed, child: const Text('Sign in')),
    );
  }
}
