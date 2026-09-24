import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/widgets/storefront.dart';
import 'product_detail_screen.dart';

/// Product catalogue screen. Used as both the Categories tab (category rail +
/// grid) and a pushed screen for a specific category (`See all`, category
/// tiles). Supports search, sorting, and pagination against `/products`.
class ProductListScreen extends ConsumerStatefulWidget {
  const ProductListScreen({super.key, this.categorySlug, this.title});

  final String? categorySlug;
  final String? title;

  @override
  ConsumerState<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends ConsumerState<ProductListScreen> {
  final TextEditingController _search = TextEditingController();
  ProductSort _sort = ProductSort.newest;
  int _page = 1;
  String? _q;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = ProductQuery(
      page: _page,
      category: widget.categorySlug,
      q: _q,
      sort: _sort,
    );
    final products = ref.watch(productsProvider(query));

    return Scaffold(
      appBar: AppBar(title: Text(widget.title ?? (widget.categorySlug == null ? 'All products' : 'Products'))),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _search,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Search products…',
                      prefixIcon: const Icon(Icons.search),
                      isDense: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onSubmitted: (value) {
                      setState(() {
                        _q = value.trim().isEmpty ? null : value.trim();
                        _page = 1;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 8),
                PopupMenuButton<ProductSort>(
                  icon: const Icon(Icons.sort),
                  tooltip: 'Sort',
                  initialValue: _sort,
                  onSelected: (value) => setState(() {
                    _sort = value;
                    _page = 1;
                  }),
                  itemBuilder: (context) => _sortOptions.map((option) {
                    return PopupMenuItem(value: option.value, child: Text(option.label));
                  }).toList(),
                ),
              ],
            ),
          ),
          Expanded(child: _buildResults(ref, products)),
        ],
      ),
    );
  }

  Widget _buildResults(WidgetRef ref, AsyncValue<ProductListResponse> products) {
    return products.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => ErrorView(
        error: error,
        onRetry: () => ref.invalidate(productsProvider(ProductQuery(
          page: _page,
          category: widget.categorySlug,
          q: _q,
          sort: _sort,
        ))),
      ),
      data: (response) {
        final items = response.items;
        if (items.isEmpty) {
          return const _EmptyCatalogue();
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(productsProvider(ProductQuery(
              page: _page,
              category: widget.categorySlug,
              q: _q,
              sort: _sort,
            )));
            await ref.read(productsProvider(ProductQuery(
              page: _page,
              category: widget.categorySlug,
              q: _q,
              sort: _sort,
            )).future);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: Text(
                    '${response.pagination.total} product${response.pagination.total == 1 ? '' : 's'}'
                    '${_q != null ? ' matching “$_q”' : ''}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.72,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final product = items[index];
                      return ProductCard(
                        product: product,
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(builder: (_) => ProductDetailScreen(slug: product.slug)),
                        ),
                      );
                    },
                    childCount: items.length,
                  ),
                ),
              ),
              if (response.pagination.pages > 1)
                SliverToBoxAdapter(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        tooltip: 'Previous page',
                        icon: const Icon(Icons.chevron_left),
                        onPressed: _page <= 1
                            ? null
                            : () => setState(() => _page -= 1),
                      ),
                      Text('${response.pagination.page} / ${response.pagination.pages}'),
                      IconButton(
                        tooltip: 'Next page',
                        icon: const Icon(Icons.chevron_right),
                        onPressed: _page >= response.pagination.pages
                            ? null
                            : () => setState(() => _page += 1),
                      ),
                    ],
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        );
      },
    );
  }

  static const List<({ProductSort value, String label})> _sortOptions = [
    (value: ProductSort.newest, label: 'Newest'),
    (value: ProductSort.priceAsc, label: 'Price: low to high'),
    (value: ProductSort.priceDesc, label: 'Price: high to low'),
    (value: ProductSort.featured, label: 'Featured'),
    (value: ProductSort.nameAsc, label: 'Name A–Z'),
  ];
}

class _EmptyCatalogue extends StatelessWidget {
  const _EmptyCatalogue();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off, size: 48, color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(height: 12),
            Text('No products found', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(
              'Try a different search or category.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}
