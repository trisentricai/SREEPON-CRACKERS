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
            return const SriPonEmptyState(
              icon: Icons.favorite_outline,
              title: 'Wishlist is empty',
              message: 'Tap the heart on a product to save it here.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(wishlistProvider),
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = items[index];
                return _WishlistTile(
                  item: item,
                  onOpen: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => ProductDetailScreen(slug: item.product.slug),
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

class _WishlistTile extends ConsumerWidget {
  const _WishlistTile({required this.item, required this.onOpen});

  final WishlistItem item;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
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
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFFB3261E)),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        FilledButton.tonal(
                          style: FilledButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          onPressed: item.availableStock <= 0
                              ? null
                              : () => _moveToCart(ref),
                          child: const Text('Move to cart'),
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
