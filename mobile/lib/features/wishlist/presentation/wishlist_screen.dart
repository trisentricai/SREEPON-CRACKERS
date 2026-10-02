import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/storefront.dart';
import '../../auth/application/auth_controller.dart';
import '../../products/presentation/product_detail_screen.dart';

/// Wishlist: saved products with "move to cart" + remove. Auth-gated.
class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Wishlist')),
        body: SriPonEmptyState(
          icon: Icons.favorite_outline,
          title: 'Sign in required',
          message: 'Sign in to see and manage your wishlist.',
          action: FilledButton(
            onPressed: () => Navigator.of(context).pushNamed('/profile'),
            child: const Text('Sign in'),
          ),
        ),
      );
    }

    final wishlist = ref.watch(wishlistProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Wishlist')),
      body: wishlist.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(wishlistProvider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Mascot(size: 120),
                    const SizedBox(height: 16),
                    Text(
                      'Wishlist is empty',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Tap the heart on a product to save it here.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: SriPonColors.inkMuted),
                    ),
                  ],
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(wishlistProvider),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: FunHeading(
                    title: 'Wishlist',
                    subtitle: 'Saved pops for later.',
                    overline: 'Saved fun',
                  ),
                ),
                for (var i = 0; i < items.length; i++) ...[
                  _WishlistTile(
                    item: items[i],
                    onOpen: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => ProductDetailScreen(slug: items[i].product.slug),
                      ),
                    ),
                  ),
                  if (i < items.length - 1) const SizedBox(height: 12),
                ],
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _WishlistTile extends ConsumerWidget {
  const _WishlistTile({required this.item, required this.onOpen});

  final WishlistItem item;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return StickerCard(
      padding: const EdgeInsets.all(12),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: SriPonColors.ink, width: 2),
              ),
              clipBehavior: Clip.antiAlias,
              child: SizedBox(
                width: 64,
                height: 64,
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
                  const SizedBox(height: 4),
                  PriceRow(basePrice: item.product.basePrice, mrpPrice: item.product.mrpPrice),
                  if (item.isAvailable) ...[
                    const SizedBox(height: 4),
                    Text(
                      formatUnit(item.product.unit.wire),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                  ] else
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Currently unavailable',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: SriPonColors.danger),
                      ),
                    ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      ChunkyButton(
                        label: 'Move to cart',
                        icon: Icons.shopping_cart_outlined,
                        color: SriPonColors.sunny,
                        onPressed: item.availableStock <= 0
                            ? null
                            : () => _moveToCart(ref),
                      ),
                      const Spacer(),
                      IconButton(
                        tooltip: 'Remove',
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => _remove(ref),
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

  Future<void> _moveToCart(WidgetRef ref) async {
    try {
      await api.post(
        '/wishlist/items/${item.product.id}/move-to-cart',
        fromJson: (json) => json,
      );
      ref.invalidate(wishlistProvider);
      ref.invalidate(cartProvider);
      if (ref.context.mounted) {
        ScaffoldMessenger.of(ref.context).showSnackBar(
          const SnackBar(content: Text('Moved to cart'), duration: Duration(seconds: 1)),
        );
      }
    } on ApiException catch (error) {
      if (ref.context.mounted) {
        ScaffoldMessenger.of(ref.context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _remove(WidgetRef ref) async {
    try {
      await api.delete('/wishlist/items/${item.product.id}');
      ref.invalidate(wishlistProvider);
    } on ApiException catch (error) {
      if (ref.context.mounted) {
        ScaffoldMessenger.of(ref.context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }
}
