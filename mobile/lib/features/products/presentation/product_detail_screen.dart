import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/storefront.dart';
import '../../auth/application/auth_controller.dart';

/// Product detail: gallery, description, unit selector, stock, and the cart /
/// wishlist actions (auth-gated).
class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int _imageIndex = 0;
  CartUnit _unit = CartUnit.box;
  int _quantity = 1;
  bool _savingCart = false;
  bool _savingWishlist = false;
  bool _inWishlist = false;

  @override
  Widget build(BuildContext context) {
    final product = ref.watch(productBySlugProvider(widget.slug));
    final auth = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(product.value?.name ?? 'Product'),
        actions: [
          IconButton(
            tooltip: 'Add to wishlist',
            icon: Icon(_inWishlist ? Icons.favorite : Icons.favorite_outline),
            onPressed: _savingWishlist || !auth.isAuthenticated
                ? null
                : () => _toggleWishlist(product.value),
          ),
        ],
      ),
      body: product.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(productBySlugProvider(widget.slug)),
        ),
        data: (value) => _buildDetail(context, value, auth),
      ),
    );
  }

  Widget _buildDetail(BuildContext context, Product product, AuthState auth) {
    final scheme = Theme.of(context).colorScheme;
    final images = product.images.isNotEmpty
        ? product.images
        : const <ProductImage>[];
    final discount = discountPercent(product.basePrice, product.mrpPrice);
    final available = product.inventory?.quantity;
    final outOfStock = available != null && available <= 0;

    return ListView(
      children: [
        // Gallery
        SizedBox(
          height: 280,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (images.isNotEmpty)
                SriponImage(url: images[_imageIndex.clamp(0, images.length - 1)].url)
              else
                Container(
                  color: scheme.surfaceContainerHighest,
                  child: Icon(Icons.local_fire_department, size: 64, color: scheme.primary.withValues(alpha: 0.4)),
                ),
              if (discount != null)
                Positioned(
                  top: 12,
                  left: 12,
                  child: StatusChip(label: '$discount% off'),
                ),
              if (images.length > 1)
                Positioned(
                  bottom: 12,
                  left: 0,
                  right: 0,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (var index = 0; index < images.length; index++)
                        GestureDetector(
                          onTap: () => setState(() => _imageIndex = index),
                          child: Container(
                            width: 10,
                            height: 10,
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _imageIndex == index
                                  ? scheme.primary
                                  : scheme.outlineVariant,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (product.category != null)
                Text(
                  product.category!.name,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(color: scheme.primary),
                ),
              const SizedBox(height: 4),
              Text(product.name, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Text('SKU ${product.sku}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
              const SizedBox(height: 8),
              PriceRow(basePrice: product.basePrice, mrpPrice: product.mrpPrice, size: 'large'),
              if (product.minimumAge != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      Icon(Icons.verified_user_outlined, size: 16, color: scheme.primary),
                      const SizedBox(width: 6),
                      Text(
                        'Age-restricted: 18+',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.primary),
                      ),
                    ],
                  ),
                ),
              if (outOfStock)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text('Currently out of stock', style: TextStyle(color: Color(0xFFB3261E))),
                )
              else if (available != null && available <= 10)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'Only $available left',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.tertiary),
                  ),
                ),
              const SizedBox(height: 16),
              const Divider(),
              _buildUnitSelector(context, product),
              _buildQuantityRow(context, product),
              if (product.description != null) ...[
                const SizedBox(height: 16),
                const Divider(),
                Text('Description', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text(product.description!, style: Theme.of(context).textTheme.bodyMedium),
              ],
              const SizedBox(height: 24),
              _buildCta(context, auth, outOfStock),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildUnitSelector(BuildContext context, Product product) {
    final units = {
      CartUnit.box,
      if (product.piecesPerBox != null || product.unit == ProductUnit.packet) CartUnit.packet,
      if (product.unit != ProductUnit.other) CartUnit.single,
    }.toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Unit', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: units.map((unit) {
            return ChoiceChip(
              label: Text(formatUnit(unit.wire)),
              selected: _unit == unit,
              onSelected: (_) => setState(() => _unit = unit),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildQuantityRow(BuildContext context, Product product) {
    final maxQty = product.inventory?.quantity;
    return Row(
      children: [
        Text('Quantity', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        const Spacer(),
        IconButton.outlined(
          tooltip: 'Decrease',
          icon: const Icon(Icons.remove),
          onPressed: _quantity <= 1 ? null : () => setState(() => _quantity -= 1),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text('$_quantity', style: Theme.of(context).textTheme.titleMedium),
        ),
        IconButton.outlined(
          tooltip: 'Increase',
          icon: const Icon(Icons.add),
          onPressed: maxQty != null && _quantity >= maxQty
              ? null
              : () => setState(() => _quantity += 1),
        ),
      ],
    );
  }

  Widget _buildCta(BuildContext context, AuthState auth, bool outOfStock) {
    if (!auth.isAuthenticated) {
      return SizedBox(
        width: double.infinity,
        child: FilledButton.icon(
          onPressed: () => Navigator.of(context).pushNamed('/profile'),
          icon: const Icon(Icons.lock_outline),
          label: const Text('Sign in to add to cart'),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          onPressed: outOfStock || _savingCart ? null : _addToCart,
          icon: _savingCart
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.add_shopping_cart),
          label: Text(outOfStock ? 'Out of stock' : 'Add to cart'),
        ),
        if (_savingCart)
          const SizedBox(
            height: 10,
            width: double.infinity,
            child: Center(
              child: Text('Added to cart', style: TextStyle(color: Color(0xFF1B7A33))),
            ),
          ),
      ],
    );
  }

  Future<void> _addToCart() async {
    final product = ref.read(productBySlugProvider(widget.slug)).value;
    if (product == null) return;
    setState(() => _savingCart = true);
    try {
      await api.post(
        '/cart/items',
        body: {'productId': product.id, 'quantity': _quantity, 'unit': _unit.wire},
        fromJson: (json) => json,
      );
      ref.invalidate(cartProvider);
      setState(() => _savingCart = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Added to cart'), duration: Duration(seconds: 1)),
        );
      }
    } on ApiException catch (error) {
      setState(() => _savingCart = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _toggleWishlist(Product? product) async {
    if (product == null) return;
    setState(() => _savingWishlist = true);
    try {
      if (_inWishlist) {
        await api.delete('/wishlist/items/${product.id}');
      } else {
        await api.post(
          '/wishlist/items',
          body: {'productId': product.id},
          fromJson: (json) => json,
        );
      }
      setState(() {
        _inWishlist = !_inWishlist;
        _savingWishlist = false;
      });
      ref.invalidate(wishlistProvider);
    } on ApiException catch (error) {
      setState(() => _savingWishlist = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }
}