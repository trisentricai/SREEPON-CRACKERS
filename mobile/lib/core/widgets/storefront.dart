/// Reusable customer storefront widgets: product cards, price rows, image
/// fallbacks, status chips, and API-state placeholders.
library;

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../utils/format.dart';

export 'widgets.dart' show SriPonEmptyState, SriPonSpinner, SriPonColors;

/// Image with a graceful fallback when [url] is null or fails to load.
class SriponImage extends StatelessWidget {
  const SriponImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.heroTag,
  });

  final String? url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Object? heroTag;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final placeholder = Container(
      width: width,
      height: height,
      color: scheme.surfaceContainerHighest,
      alignment: Alignment.center,
      child: Icon(Icons.local_fire_department, color: scheme.primary.withValues(alpha: 0.4)),
    );

    final value = url;
    if (value == null || value.isEmpty) return placeholder;

    return Image.network(
      value,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (_, __, ___) => placeholder,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return SizedBox(
          width: width,
          height: height,
          child: Center(
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: scheme.primary),
            ),
          ),
        );
      },
    );
  }
}

/// Horizontal product card used in grids and carousels.
class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, this.onTap});

  final Product product;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final discount = discountPercent(product.basePrice, product.mrpPrice);
    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      color: scheme.surfaceContainerLow,
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  SriponImage(url: product.coverUrl),
                  if (discount != null)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: scheme.tertiaryContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '$discount% off',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: scheme.onTertiaryContainer,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 4),
                  if (product.category != null)
                    Text(
                      product.category!.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  const SizedBox(height: 6),
                  PriceRow(basePrice: product.basePrice, mrpPrice: product.mrpPrice),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Compact circular category tile (home page + category rail).
class CategoryTile extends StatelessWidget {
  const CategoryTile({super.key, required this.name, required this.imageUrl, this.onTap});

  final String name;
  final String? imageUrl;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipOval(
            child: SizedBox(
              width: 64,
              height: 64,
              child: imageUrl == null
                  ? Container(
                      color: scheme.surfaceContainerHighest,
                      child: Icon(Icons.category_outlined, color: scheme.primary),
                    )
                  : SriponImage(url: imageUrl, fit: BoxFit.cover),
            ),
          ),
          const SizedBox(height: 6),
          SizedBox(
            width: 72,
            child: Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.labelMedium,
            ),
          ),
        ],
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
    final scheme = Theme.of(context).colorScheme;
    final heading = size == 'large' ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.titleMedium;
    final label = size == 'large' ? Theme.of(context).textTheme.bodyMedium : Theme.of(context).textTheme.bodySmall;
    final hasDiscount = discountPercent(basePrice, mrpPrice) != null;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          formatMoney(basePrice),
          style: heading?.copyWith(color: scheme.primary, fontWeight: FontWeight.w700),
        ),
        if (hasDiscount && mrpPrice != null) ...[
          const SizedBox(width: 6),
          Text(
            formatMoney(mrpPrice),
            style: label?.copyWith(
              color: scheme.onSurfaceVariant,
              decoration: TextDecoration.lineThrough,
            ),
          ),
        ],
      ],
    );
  }
}

/// Colored status chip for order / payment statuses.
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label});

  final String label;

  static const Map<String, Color> _colors = {
    'PENDING': Color(0xFF8A6D1D),
    'CONFIRMED': Color(0xFF1F6F43),
    'PROCESSING': Color(0xFF1F6F43),
    'PACKED': Color(0xFF1F6F43),
    'SHIPPED': Color(0xFF2962B0),
    'OUT_FOR_DELIVERY': Color(0xFF2962B0),
    'DELIVERED': Color(0xFF1B7A33),
    'CANCELLED': Color(0xFFB3261E),
    'RETURN_REQUESTED': Color(0xFF8A3A9B),
    'RETURNED': Color(0xFF6E6E6E),
    'PAID': Color(0xFF1B7A33),
    'FAILED': Color(0xFFB3261E),
    'REFUNDED': Color(0xFF6E6E6E),
    'PARTIALLY_REFUNDED': Color(0xFF8A6D1D),
  };

  @override
  Widget build(BuildContext context) {
    final color = _colors[label] ?? const Color(0xFF6E6E6E);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label.split('_').map((part) => part[0] + part.substring(1).toLowerCase()).join(' '),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}

/// Generic API error placeholder with retry.
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_off, size: 40, color: scheme.error),
            const SizedBox(height: 12),
            Text(
              error.toString(),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton.tonalIcon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Retry')),
            ],
          ],
        ),
      ),
    );
  }
}

/// Section title used across the storefront (home rows, listings).
class SectionHeading extends StatelessWidget {
  const SectionHeading({super.key, required this.title, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}