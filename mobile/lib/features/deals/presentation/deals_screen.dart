import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/api_providers.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/storefront.dart';
import '../../../core/widgets/widgets.dart';
import '../../products/presentation/product_detail_screen.dart';

/// Deals tab: all products with a viable MRP discount, sorted by discount
/// desc. Reads the page-1 limit-60 `/products` page then filters client-side
/// so the badge math matches [ProductCard].
class DealsScreen extends ConsumerWidget {
  const DealsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = ProductQuery(page: 1, limit: 60);
    final products = ref.watch(productsProvider(query));

    return Scaffold(
      appBar: AppBar(title: const Text('Deals')),
      body: products.when(
        loading: () => GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.66,
          ),
          itemCount: 6,
          itemBuilder: (_, __) => const SriPonShimmer(borderRadius: 14),
        ),
        error: (error, stack) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(productsProvider(query)),
        ),
        data: (response) {
          final deals = response.items
              .where((p) => discountPercent(p.basePrice, p.mrpPrice) != null)
              .toList()
            ..sort((a, b) => discountPercent(b.basePrice, b.mrpPrice)!
                .compareTo(discountPercent(a.basePrice, a.mrpPrice)!));
          if (deals.isEmpty) {
            return const _EmptyDeals();
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(productsProvider(query)),
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, 4),
                    child: FunHeading(
                      title: "Today's deals",
                      overline: 'Fresh today',
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.66,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final product = deals[index];
                        return ProductCard(
                          product: product,
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) =>
                                  ProductDetailScreen(slug: product.slug),
                            ),
                          ),
                        );
                      },
                      childCount: deals.length,
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _EmptyDeals extends StatelessWidget {
  const _EmptyDeals();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Mascot(size: 120),
            const SizedBox(height: 16),
            Text(
              'No deals right now!',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              'Check back soon for fresh price drops.',
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: SriPonColors.inkMuted),
            ),
          ],
        ),
      ),
    );
  }
}
