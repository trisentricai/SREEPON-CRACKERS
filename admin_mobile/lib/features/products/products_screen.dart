import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/products.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

final productsProvider = FutureProvider<ProductListResponse>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/products',
    query: {'limit': 20},
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

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(productsProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Column(
              children: [
                SectionHeader(
                  title: 'Products',
                  subtitle: 'Catalogue management',
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(icon: const Icon(Icons.search), onPressed: () {}),
                      IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.refresh(productsProvider)),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: TextField(
                    controller: _search,
                    decoration: const InputDecoration(
                      hintText: 'Search products…',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onSubmitted: (_) => ref.refresh(productsProvider),
                  ),
                ),
              ],
            ),
          ),
          async.when(
            data: (resp) => _buildList(context, resp),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load products',
                onRetry: () => ref.refresh(productsProvider),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildList(BuildContext context, ProductListResponse resp) {
    if (resp.items.isEmpty) {
      return const SliverFillRemaining(
        child: EmptyState(title: 'No products yet.', icon: Icons.shopping_bag_outlined),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final product = resp.items[index];
          return _ProductRow(product: product);
        },
        childCount: resp.items.length,
      ),
    );
  }
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: ListTile(
        leading: product.imageUrl != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(product.imageUrl!, width: 56, height: 56, fit: BoxFit.cover),
              )
            : const CircleAvatar(child: Icon(Icons.image_outlined)),
        title: Text(product.name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Text(product.sku ?? '', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(width: 12),
                Text(formatMoney(product.basePrice), style: const TextStyle(fontSize: 12, color: Colors.grey)),
                if (product.categoryName != null) ...[
                  const SizedBox(width: 12),
                  Text(product.categoryName!, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ],
            ),
          ],
        ),
        trailing: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                StatusChip(
                  text: product.isActive ? 'Active' : 'Inactive',
                  tone: product.isActive ? 'green' : 'slate',
                ),
                const SizedBox(width: 8),
                Switch(
                  value: product.isActive,
                  onChanged: (_) {},
                  activeColor: SreeponAdminTheme.flame600,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
