import 'package:sreepon_admin/core/utils/format.dart';
import 'orders.dart';

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.slug,
    required this.sku,
    required this.basePrice,
    required this.unit,
    this.description,
    this.categoryId,
    this.categoryName,
    this.imageUrl,
    required this.isActive,
    required this.isApproved,
    required this.isFeatured,
    this.stock,
    this.createdAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String?,
      sku: json['sku'] as String?,
      basePrice: (json['basePrice'] ?? '0.00').toString(),
      unit: json['unit'] as String?,
      description: json['description'] as String?,
      categoryId: json['categoryId'] as String?,
      categoryName: json['categoryName'] as String?,
      imageUrl: json['imageUrl'] as String?,
      isActive: (json['isActive'] ?? false) as bool,
      isApproved: (json['isApproved'] ?? false) as bool,
      isFeatured: (json['isFeatured'] ?? false) as bool,
      stock: json['stock'] as int?,
      createdAt: json['createdAt'] as String?,
    );
  }

  final String id;
  final String name;
  final String? slug;
  final String? sku;
  final String basePrice;
  final String? unit;
  final String? description;
  final String? categoryId;
  final String? categoryName;
  final String? imageUrl;
  final bool isActive;
  final bool isApproved;
  final bool isFeatured;
  final int? stock;
  final String? createdAt;
}

class ProductListResponse {
  const ProductListResponse({required this.items, required this.pagination});

  factory ProductListResponse.fromJson(Map<String, dynamic> json) {
    return ProductListResponse(
      items: (json['items'] as List<dynamic>)
          .map((e) => Product.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: Pagination.fromJson(json['pagination'] as Map<String, dynamic>),
    );
  }

  final List<Product> items;
  final Pagination pagination;
}
