/// Riverpod providers that fetch SriPon API data. Each screen consumes these
/// through `ref.watch`; `FutureProvider` retries are handled by the UI with
/// `ref.invalidate`. Live data flows from the backend envelope, and every
/// customer-gated endpoint (cart, wishlist, orders, profile) requires the
/// Firebase session that [api] attaches automatically.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../network/api_client.dart';

/// `AsyncValue` helpers used across screens.
extension AsyncValueX<T> on AsyncValue<T> {
  bool get isLoadingNew => isLoading && !hasValue;
}

/* ------------------------------------------------------------------ */
/* Catalog + homepage                                                   */
/* ------------------------------------------------------------------ */

final categoriesTreeProvider = FutureProvider<List<CategoryTreeNode>>((ref) async {
  return api.get('/categories/tree', fromJson: (json) {
    final raw = json as List<dynamic>;
    return raw.map((node) => CategoryTreeNode.fromJson(node)).toList();
  });
});

final publicSettingsProvider = FutureProvider<PublicSettings>((ref) async {
  return api.get('/settings/public', fromJson: PublicSettings.fromJson);
});

final homepageProvider = FutureProvider<HomepageData>((ref) async {
  return api.get('/homepage', fromJson: HomepageData.fromJson);
});

/// Products list with filters. Accepts page (1-based), category slug, search
/// term, and sort. Returns the backend `{ items, pagination }` page.
final productsProvider =
    FutureProvider.autoDispose.family<ProductListResponse, ProductQuery>((ref, query) async {
  return api.get(
    '/products',
    query: {
      if (query.page > 1) 'page': query.page,
      if (query.limit != 20) 'limit': query.limit,
      if (query.category != null) 'category': query.category,
      if (query.q != null) 'q': query.q,
      if (query.sort != null) 'sort': query.sort!.wire,
      if (query.minPrice != null) 'minPrice': query.minPrice,
      if (query.maxPrice != null) 'maxPrice': query.maxPrice,
      if (query.featured) 'featured': true,
    },
    fromJson: ProductListResponse.fromJson,
  );
});

/// Product detail by slug.
final productBySlugProvider =
    FutureProvider.autoDispose.family<Product, String>((ref, slug) async {
  return api.get('/products/slug/$slug', fromJson: Product.fromJson);
});

/// Immutable filters for product listings.
class ProductQuery {
  const ProductQuery({
    this.page = 1,
    this.limit = 20,
    this.category,
    this.q,
    this.sort,
    this.minPrice,
    this.maxPrice,
    this.featured = false,
  });

  final int page;
  final int limit;
  final String? category;
  final String? q;
  final ProductSort? sort;
  final double? minPrice;
  final double? maxPrice;
  final bool featured;

  ProductQuery copyWith({
    int? page,
    int? limit,
    String? category,
    String? q,
    ProductSort? sort,
    double? minPrice,
    double? maxPrice,
    bool? featured,
  }) {
    return ProductQuery(
      page: page ?? this.page,
      limit: limit ?? this.limit,
      category: category ?? this.category,
      q: q ?? this.q,
      sort: sort ?? this.sort,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      featured: featured ?? this.featured,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Cart + wishlist (auth-gated)                                        */
/* ------------------------------------------------------------------ */

final cartProvider = FutureProvider<Cart>((ref) async {
  return api.get('/cart', fromJson: Cart.fromJson);
});

final wishlistProvider = FutureProvider<List<WishlistItem>>((ref) async {
  final raw = await api.getRaw('/wishlist');
  return (raw as List<dynamic>).map((item) => WishlistItem.fromJson(item)).toList();
});

/* ------------------------------------------------------------------ */
/* Addresses (auth-gated)                                              */
/* ------------------------------------------------------------------ */

final addressesProvider = FutureProvider<List<Address>>((ref) async {
  final raw = await api.getRaw('/addresses');
  return (raw as List<dynamic>).map((address) => Address.fromJson(address)).toList();
});

/* ------------------------------------------------------------------ */
/* Orders (auth-gated)                                                 */
/* ------------------------------------------------------------------ */

final ordersProvider =
    FutureProvider.autoDispose.family<OrderListResponse, int>((ref, page) async {
  return api.get(
    '/orders',
    query: {'page': page, 'limit': 20},
    fromJson: OrderListResponse.fromJson,
  );
});

final orderByIdProvider =
    FutureProvider.autoDispose.family<Order, String>((ref, orderId) async {
  return api.get('/orders/$orderId', fromJson: Order.fromJson);
});

/* ------------------------------------------------------------------ */
/* Profile (auth-gated)                                                */
/* ------------------------------------------------------------------ */

final profileProvider = FutureProvider<PublicProfile>((ref) async {
  return api.get('/users/me', fromJson: PublicProfile.fromJson);
});