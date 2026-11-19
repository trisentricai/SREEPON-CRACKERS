/// Reusable customer storefront widgets: product cards, price rows, image
/// fallbacks, status chips, and API-state placeholders.
library;

import 'package:flutter/material.dart';
import 'package:flutter_iconly_plus/flutter_iconly_plus.dart';

import '../models/models.dart';
import '../utils/format.dart';
import 'widgets.dart';

export 'widgets.dart'
    show SriPonEmptyState, SriPonSpinner, SriPonMinusIcon, SriPonColors, SriPonMetrics;

/// Map a focal-point preset to a Flutter [Alignment] for image cropping.
Alignment imagePositionAlignment(ImagePosition position) {
  switch (position) {
    case ImagePosition.top:
      return Alignment.topCenter;
    case ImagePosition.topLeft:
      return Alignment.topLeft;
    case ImagePosition.topRight:
      return Alignment.topRight;
    case ImagePosition.left:
      return Alignment.centerLeft;
    case ImagePosition.right:
      return Alignment.centerRight;
    case ImagePosition.bottom:
      return Alignment.bottomCenter;
    case ImagePosition.bottomLeft:
      return Alignment.bottomLeft;
    case ImagePosition.bottomRight:
      return Alignment.bottomRight;
    case ImagePosition.center:
      return Alignment.center;
  }
}

/// Image with a graceful fallback when [url] is null or fails to load.
class SriponImage extends StatelessWidget {
  const SriponImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.alignment = Alignment.center,
    this.heroTag,
  });

  final String? url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Alignment alignment;
  final Object? heroTag;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: width,
      height: height,
      color: SriPonColors.surface,
      alignment: Alignment.center,
      child: Icon(IconlyLight.ticket_star, color: SriPonColors.accent.withValues(alpha: 0.32)),
    );

    final value = url;
    if (value == null || value.isEmpty) return placeholder;

    return Image.network(
      value,
      width: width,
      height: height,
      fit: fit,
      alignment: alignment,
      errorBuilder: (_, __, ___) => placeholder,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return SizedBox(
          width: width,
          height: height,
          child: const SriPonShimmer(borderRadius: 0),
        );
      },
    );
  }
}

/// Mockup-style product card: white 16px surface, neutral image well, 14px
/// bold name, muted note, price, and an optional 44px circular Add button.
class ProductCard extends StatefulWidget {
  const ProductCard({super.key, required this.product, this.onTap, this.onAdd});

  final Product product;
  final VoidCallback? onTap;

  /// When supplied, shows the circular quick-add button (cart mutation is
  /// owned by the caller so auth/API behaviour stays in the feature layer).
  final VoidCallback? onAdd;

  @override
  State<ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<ProductCard> {
  bool _pressed = false;

  Product get product => widget.product;

  @override
  Widget build(BuildContext context) {
    final discount = discountPercent(product.basePrice, product.mrpPrice);
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(SriPonMetrics.rowRadius),
        border: Border.all(color: SriPonColors.line),
        boxShadow: const [
          BoxShadow(color: Color(0x0F000000), blurRadius: 2, offset: Offset(0, 1)),
        ],
      ),
      child: AnimatedPhysicalModel(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        elevation: _pressed ? 6 : 0,
        borderRadius: BorderRadius.circular(SriPonMetrics.rowRadius),
        color: SriPonColors.bg,
        shadowColor: Colors.black.withValues(alpha: 0.12),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            InkWell(
              onTap: widget.onTap,
              onHighlightChanged: (value) => setState(() => _pressed = value),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(10),
                    child: AspectRatio(
                      aspectRatio: 1.18,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: SizedBox.expand(
                          child: SriponImage(
                            url: product.coverUrl,
                            width: double.infinity,
                            height: double.infinity,
                            alignment: imagePositionAlignment(product.coverPosition),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(10, 0, 10, 58),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.01,
                              ),
                        ),
                        const SizedBox(height: 3),
                        if (product.category != null)
                          Text(
                            product.category!.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: SriPonColors.muted,
                                  fontSize: 11.5,
                                ),
                          ),
                        const SizedBox(height: 5),
                        PriceRow(basePrice: product.basePrice, mrpPrice: product.mrpPrice, size: 'compact'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (discount != null)
              Positioned(
                top: 18,
                left: 18,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: SriPonColors.accentSoft,
                    borderRadius: BorderRadius.circular(980),
                  ),
                  child: Text(
                    '$discount% off',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: SriPonColors.accentDeep,
                    ),
                  ),
                ),
              ),
            if (widget.onAdd != null)
              Positioned(
                right: 9,
                bottom: 9,
                child: Semantics(
                  button: true,
                  label: 'Add ${product.name} to cart',
                  child: Material(
                    color: SriPonColors.fg,
                    shape: const CircleBorder(),
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: widget.onAdd,
                      child: const SizedBox(
                        width: 44,
                        height: 44,
                        child: Icon(IconlyLight.plus, size: 18, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Compact pill category chip (home category rail, category sections).
class CategoryTile extends StatelessWidget {
  const CategoryTile({super.key, required this.name, required this.imageUrl, this.onTap});

  final String name;
  final String? imageUrl;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: SriPonColors.bg,
      borderRadius: BorderRadius.circular(980),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(980),
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 15),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(980),
            border: Border.all(color: SriPonColors.line),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(IconlyLight.category, size: 16, color: SriPonColors.accent),
              const SizedBox(width: 8),
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: SriPonColors.muted,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Price row: sale price + strikethrough MRP when a discount exists.
class PriceRow extends StatelessWidget {
  const PriceRow({super.key, required this.basePrice, this.mrpPrice, this.size = 'medium'});

  final String basePrice;
  final String? mrpPrice;
  final String size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    final compact = size == 'compact';
    final heading = switch (size) {
      'compact' => theme.bodyMedium?.copyWith(
          fontSize: 13, fontWeight: FontWeight.w700, color: SriPonColors.fg),
      'large' => theme.titleLarge?.copyWith(fontWeight: FontWeight.w700, color: SriPonColors.accent),
      _ => theme.titleMedium?.copyWith(fontWeight: FontWeight.w700, color: SriPonColors.accent),
    };
    final label = compact
        ? theme.bodySmall?.copyWith(fontSize: 11, color: SriPonColors.muted)
        : theme.bodySmall?.copyWith(color: SriPonColors.muted);
    final hasDiscount = discountPercent(basePrice, mrpPrice) != null;
    return Wrap(
      spacing: 6,
      runSpacing: 2,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(formatMoney(basePrice), style: heading),
        if (hasDiscount && mrpPrice != null)
          Text(
            formatMoney(mrpPrice),
            style: label?.copyWith(decoration: TextDecoration.lineThrough),
          ),
      ],
    );
  }
}

/// Colored status chip for order / payment statuses.
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label});

  final String label;

  static const Color _neutral = Color(0xFF6E6E73);
  static const Map<String, Color> _colors = {
    'PENDING': SriPonColors.warning,
    'CONFIRMED': SriPonColors.success,
    'PROCESSING': SriPonColors.success,
    'PACKED': SriPonColors.success,
    'SHIPPED': SriPonColors.accent,
    'OUT_FOR_DELIVERY': SriPonColors.accent,
    'DELIVERED': SriPonColors.success,
    'CANCELLED': SriPonColors.danger,
    'RETURN_REQUESTED': SriPonColors.warning,
    'RETURNED': _neutral,
    'PAID': SriPonColors.success,
    'FAILED': SriPonColors.danger,
    'REFUNDED': _neutral,
    'PARTIALLY_REFUNDED': SriPonColors.warning,
  };

  @override
  Widget build(BuildContext context) {
    final color = _colors[label] ?? _neutral;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(980),
      ),
      child: Text(
        label.split('_').map((part) => part[0] + part.substring(1).toLowerCase()).join(' '),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

/// Generic API error placeholder with retry, on a neutral card.
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 32),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          decoration: BoxDecoration(
            color: SriPonColors.surfaceWarm,
            borderRadius: BorderRadius.circular(SriPonMetrics.cardRadius),
            border: Border.all(color: SriPonColors.line),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: SriPonColors.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(IconlyLight.danger, size: 22, color: SriPonColors.danger),
              ),
              const SizedBox(height: 14),
              Text(
                error.toString(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: SriPonColors.muted),
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(IconlyLight.swap, size: 18),
                  label: const Text('Retry'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Section title used across the storefront (home rows, listings).
class SectionHeading extends StatelessWidget {
  const SectionHeading({super.key, required this.title, this.trailing, this.overline});

  final String title;
  final Widget? trailing;
  final String? overline;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 8, 18, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (overline != null) ...[
                  Text(
                    overline!.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: SriPonColors.accent,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                ],
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 20),
                ),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
