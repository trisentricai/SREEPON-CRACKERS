import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/storefront.dart';
import '../../../core/widgets/widgets.dart';
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
        loading: () => ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            SizedBox(height: 320, child: SriPonShimmer(borderRadius: 16)),
            SizedBox(height: 16),
            SizedBox(width: 180, height: 18, child: SriPonShimmer(borderRadius: 8)),
            SizedBox(height: 8),
            SizedBox(width: 280, height: 14, child: SriPonShimmer(borderRadius: 7)),
            SizedBox(height: 24),
            SizedBox(width: 220, height: 24, child: SriPonShimmer(borderRadius: 10)),
          ],
        ),
        error: (error, stack) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(productBySlugProvider(widget.slug)),
        ),
        data: (value) => _buildDetail(context, value, auth),
      ),
    );
  }

  static const _specPastels = <Color>[
    SriPonColors.sunny100,
    SriPonColors.bubble100,
    SriPonColors.grape100,
    SriPonColors.mint100,
    SriPonColors.candy100,
  ];

  Widget _buildDetail(BuildContext context, Product product, AuthState auth) {
    final scheme = Theme.of(context).colorScheme;
    final images = product.images.isNotEmpty
        ? product.images
        : const <ProductImage>[];
    final discount = discountPercent(product.basePrice, product.mrpPrice);
    final available = product.inventory?.quantity;
    final outOfStock = available != null && available <= 0;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      children: [
        // Gallery inside a white sticker frame.
        StickerCard(
          padding: const EdgeInsets.all(8),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: SriPonColors.ink, width: 2),
            ),
            clipBehavior: Clip.antiAlias,
            child: SizedBox(
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
                      top: 8,
                      right: 8,
                      child: Starburst(label: '$discount%', sub: 'off', size: 72),
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
                                  border: Border.all(color: SriPonColors.ink, width: 1),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (product.isFeatured)
              const FunChip(icon: Icons.star, label: 'Featured', color: SriPonColors.sunny100),
            if (outOfStock)
              const FunChip(icon: Icons.block, label: 'Out of stock', color: SriPonColors.candy100)
            else if (available != null && available <= 10)
              FunChip(icon: Icons.timer_outlined, label: 'Only $available left', color: SriPonColors.grape100)
            else
              const FunChip(icon: Icons.check_circle_outline, label: 'In stock', color: SriPonColors.mint100),
          ],
        ),
        const SizedBox(height: 10),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
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
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          formatMoney(product.basePrice),
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: SriPonColors.coral600,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        if (discount != null && product.mrpPrice != null)
                          Text(
                            formatMoney(product.mrpPrice),
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: scheme.onSurfaceVariant,
                                  decoration: TextDecoration.lineThrough,
                                ),
                          ),
                      ],
                    ),
                  ),
                  if (discount != null) Starburst(label: '$discount%', sub: 'off', size: 76),
                ],
              ),
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
                  child: Text('Currently out of stock', style: TextStyle(color: SriPonColors.danger)),
                )
              else if (available != null && available <= 10)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'Only $available left',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.tertiary),
                  ),
                ),
              const SizedBox(height: 12),
              _buildSpecTiles(context, product, available),
              const SizedBox(height: 12),
              _buildUnitSelector(context, product),
              const SizedBox(height: 8),
              _buildQuantityRow(context, product),
              if (product.description != null) ...[
                const SizedBox(height: 12),
                StickerCard(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Description', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text(product.description!, style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              _buildCta(context, auth, outOfStock, product),
              const SizedBox(height: 12),
              const Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FunChip(icon: Icons.local_shipping_outlined, label: 'Ships in 24–48h', color: SriPonColors.bubble100),
                  FunChip(icon: Icons.security, label: 'Licensed stock', color: SriPonColors.mint100),
                  FunChip(icon: Icons.receipt_long_outlined, label: 'GST invoice', color: SriPonColors.sunny100),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSpecTiles(BuildContext context, Product product, int? available) {
    final specs = <(String, String)>[
      ('SKU', product.sku),
      ('Unit', formatUnit(product.unit.wire)),
      if (product.piecesPerBox != null) ('Pieces', '${product.piecesPerBox}'),
      if (product.weightPerBox != null) ('Weight', product.weightPerBox!),
      if (product.minimumAge != null) ('Age', '${product.minimumAge}+'),
      if (product.category != null) ('Category', product.category!.name),
      if (available != null) ('Stock', '$available'),
    ];
    if (specs.isEmpty) return const SizedBox.shrink();
    return Column(
      children: [
        for (var i = 0; i < specs.length; i++)
          Container(
            margin: EdgeInsets.only(bottom: i == specs.length - 1 ? 0 : 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: _specPastels[i % _specPastels.length],
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: SriPonColors.ink, width: 2),
              boxShadow: stickerShadow(dx: 2, dy: 2),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    specs[i].$1,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                ),
                Text(
                  specs[i].$2,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
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
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: SriPonColors.ink, width: 2),
            boxShadow: stickerShadow(dx: 2, dy: 2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                tooltip: 'Decrease',
                icon: const Icon(Icons.remove, size: 18),
                visualDensity: VisualDensity.compact,
                onPressed: _quantity <= 1 ? null : () => setState(() => _quantity -= 1),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('$_quantity', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
              ),
              IconButton(
                tooltip: 'Increase',
                icon: const Icon(Icons.add, size: 18),
                visualDensity: VisualDensity.compact,
                onPressed: maxQty != null && _quantity >= maxQty
                    ? null
                    : () => setState(() => _quantity += 1),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCta(BuildContext context, AuthState auth, bool outOfStock, Product product) {
    if (!auth.isAuthenticated) {
      return SizedBox(
        width: double.infinity,
        child: ChunkyButton(
          label: 'Sign in to add to cart',
          icon: Icons.lock_outline,
          color: SriPonColors.sunny,
          onPressed: () => Navigator.of(context).pushNamed('/profile'),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: ChunkyButton(
                label: outOfStock ? 'Out of stock' : 'Add to cart',
                icon: Icons.add_shopping_cart,
                color: SriPonColors.coral600,
                foreground: Colors.white,
                onPressed: outOfStock || _savingCart ? null : _addToCart,
              ),
            ),
            const SizedBox(width: 10),
            ChunkyButton(
              label: _inWishlist ? 'Saved' : 'Wishlist',
              icon: _inWishlist ? Icons.favorite : Icons.favorite_outline,
              color: Colors.white,
              onPressed: _savingWishlist ? null : () => _toggleWishlist(product),
            ),
          ],
        ),
        if (_savingCart)
          const SizedBox(
            height: 10,
            width: double.infinity,
            child: Center(
              child: Text('Added to cart', style: TextStyle(color: SriPonColors.success)),
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