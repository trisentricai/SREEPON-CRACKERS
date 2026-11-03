import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/products.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/products/product_form_screen.dart';

/// Current product search term.
final productsQueryProvider = StateProvider<String>((ref) => '');

final productsProvider = FutureProvider.autoDispose<ProductListResponse>((ref) async {
  final query = ref.watch(productsQueryProvider).trim();
  final data = await api.get<Map<String, dynamic>>(
    '/admin/products',
    query: {
      'page': 1,
      'limit': 100,
      if (query.isNotEmpty) 'q': query,
    },
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return ProductListResponse.fromJson(data);
});

class ProductsScreen extends ConsumerStatefulWidget {
  const ProductsScreen({super.key});

  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen> {
  final _search = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) ref.read(productsQueryProvider.notifier).state = value;
    });
  }

  Future<void> _openForm({Product? product}) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => ProductFormScreen(productId: product?.id)),
    );
    if (saved == true && mounted) {
      ref.invalidate(productsProvider);
    }
  }

  Future<void> _toggleVisibility(Product product) async {
    try {
      await api.patch<Map<String, dynamic>>(
        path: '/admin/products/${product.id}/visibility',
        body: {'isActive': !product.isActive},
        fromJson: (json) => json as Map<String, dynamic>,
      );
      ref.invalidate(productsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(!product.isActive ? 'Product published' : 'Product hidden')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e is ApiException ? e.message : 'Could not update visibility'),
            backgroundColor: SreeponAdminTheme.red600,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(productsProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SectionHeader(
              title: 'Products',
              subtitle: 'Catalogue management',
              trailing: IconButton(
                icon: const Icon(Icons.refresh),
                tooltip: 'Refresh',
                onPressed: () => ref.invalidate(productsProvider),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _search,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Search by name or SKU…',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _search.text.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _search.clear();
                            ref.read(productsQueryProvider.notifier).state = '';
                            setState(() {});
                          },
                        ),
                ),
                onChanged: (value) {
                  setState(() {});
                  _onSearchChanged(value);
                },
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: async.when(
                data: (resp) => _buildList(resp),
                loading: () => const Spinner(label: 'Loading products…'),
                error: (e, _) => ErrorState(
                  message: e is ApiException ? e.message : 'Failed to load products',
                  onRetry: () => ref.invalidate(productsProvider),
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(),
        icon: const Icon(Icons.add),
        label: const Text('Add product'),
      ),
    );
  }

  Widget _buildList(ProductListResponse resp) {
    if (resp.items.isEmpty) {
      return EmptyState(
        title: 'No products found.',
        subtitle: 'Tap “Add product” to create your first one.',
        icon: Icons.shopping_bag_outlined,
        action: () => ref.invalidate(productsProvider),
        actionLabel: 'Refresh',
      );
    }

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(productsProvider),
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: 96),
        itemCount: resp.items.length,
        itemBuilder: (context, index) {
          final product = resp.items[index];
          return _ProductRow(
            product: product,
            onTap: () => _openForm(product: product),
            onToggle: () => _toggleVisibility(product),
          );
        },
      ),
    );
  }
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({required this.product, required this.onTap, required this.onToggle});

  final Product product;
  final VoidCallback onTap;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Thumbnail(url: product.imageUrl),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(
                      [
                        if (product.sku != null && product.sku!.isNotEmpty) product.sku!,
                        formatMoney(product.basePrice),
                        if (product.categoryName != null) product.categoryName!,
                        if (product.stock != null) '${product.stock} in stock',
                      ].join(' · '),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        StatusChip(
                          text: product.isActive ? 'Published' : 'Hidden',
                          tone: product.isActive ? 'green' : 'slate',
                        ),
                        if (!product.isApproved)
                          const StatusChip(text: 'Unapproved', tone: 'amber'),
                        if (product.isFeatured)
                          const StatusChip(text: 'Featured', tone: 'indigo'),
                      ],
                    ),
                  ],
                ),
              ),
              Switch(
                value: product.isActive,
                onChanged: (_) => onToggle(),
                activeThumbColor: SreeponAdminTheme.flame600,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Thumbnail extends StatelessWidget {
  const _Thumbnail({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return const CircleAvatar(
        radius: 26,
        backgroundColor: SreeponAdminTheme.slate100,
        child: Icon(Icons.image_outlined, color: SreeponAdminTheme.slate400),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        url!,
        width: 52,
        height: 52,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => const CircleAvatar(
          radius: 26,
          backgroundColor: SreeponAdminTheme.slate100,
          child: Icon(Icons.broken_image_outlined, color: SreeponAdminTheme.slate400),
        ),
      ),
    );
  }
}
