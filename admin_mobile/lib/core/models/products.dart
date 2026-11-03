import 'orders.dart';

class ProductImage {
  const ProductImage({
    required this.url,
    this.id,
    this.altText,
    this.cloudinaryPublicId,
    this.objectPosition,
  });

  factory ProductImage.fromJson(Map<String, dynamic> json) {
    return ProductImage(
      id: json['id'] as String?,
      url: (json['url'] ?? '') as String,
      altText: json['altText'] as String?,
      cloudinaryPublicId: json['cloudinaryPublicId'] as String?,
      objectPosition: json['objectPosition'] as String?,
    );
  }

  final String? id;
  final String url;
  final String? altText;
  final String? cloudinaryPublicId;
  final String? objectPosition;
}

/// Product as returned by `/products` (public) and `/admin/products`.
///
/// The API nests the category and images:
/// `{ category: { id, name, slug } | null, images: [{ url, ... }],
///    inventory: { quantity, lowStockThreshold } }`.
class Product {
  const Product({
    required this.id,
    required this.name,
    this.slug,
    this.sku,
    this.description,
    this.shortDescription,
    this.categoryId,
    this.categoryName,
    this.images = const [],
    this.basePrice = '0.00',
    this.mrpPrice,
    this.unit,
    this.piecesPerBox,
    this.weightPerBox,
    this.minimumAge,
    this.isActive = false,
    this.isApproved = false,
    this.isFeatured = false,
    this.stock,
    this.createdAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    final category = json['category'] is Map<String, dynamic>
        ? json['category'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final images = ((json['images'] as List<dynamic>?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(ProductImage.fromJson)
        .toList();
    final inventory = json['inventory'] is Map<String, dynamic>
        ? json['inventory'] as Map<String, dynamic>
        : const <String, dynamic>{};

    return Product(
      id: json['id'] as String,
      name: (json['name'] ?? '') as String,
      slug: json['slug'] as String?,
      sku: json['sku'] as String?,
      description: json['description'] as String?,
      shortDescription: json['shortDescription'] as String?,
      categoryId: (json['categoryId'] ?? category['id']) as String?,
      categoryName: (json['categoryName'] ?? category['name']) as String?,
      images: images,
      basePrice: (json['basePrice'] ?? '0.00').toString(),
      mrpPrice: json['mrpPrice']?.toString(),
      unit: json['unit'] as String?,
      piecesPerBox: _asIntOrNull(json['piecesPerBox']),
      weightPerBox: json['weightPerBox']?.toString(),
      minimumAge: _asIntOrNull(json['minimumAge']),
      isActive: json['isActive'] == true,
      isApproved: json['isApproved'] == true,
      isFeatured: json['isFeatured'] == true,
      stock: _asIntOrNull(inventory['quantity'] ?? json['stock']),
      createdAt: json['createdAt'] as String?,
    );
  }

  final String id;
  final String name;
  final String? slug;
  final String? sku;
  final String? description;
  final String? shortDescription;
  final String? categoryId;
  final String? categoryName;
  final List<ProductImage> images;
  final String basePrice;
  final String? mrpPrice;
  final String? unit;
  final int? piecesPerBox;
  final String? weightPerBox;
  final int? minimumAge;
  final bool isActive;
  final bool isApproved;
  final bool isFeatured;
  final int? stock;
  final String? createdAt;

  String? get imageUrl => images.isEmpty ? null : images.first.url;
}

class ProductListResponse {
  const ProductListResponse({required this.items, required this.pagination});

  factory ProductListResponse.fromJson(Map<String, dynamic> json) {
    return ProductListResponse(
      items: ((json['items'] as List<dynamic>?) ?? const [])
          .map((e) => Product.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: Pagination.fromJson((json['pagination'] as Map<String, dynamic>?) ?? const {}),
    );
  }

  final List<Product> items;
  final Pagination pagination;
}

int? _asIntOrNull(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}
