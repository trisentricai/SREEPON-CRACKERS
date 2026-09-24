/// Catalog models mirroring `backend/src/modules/products` + categories.
library;

import 'api_envelope.dart';

/// Unit of sale for a product.
enum ProductUnit {
  box('BOX'),
  packet('PACKET'),
  single('SINGLE'),
  other('OTHER');

  const ProductUnit(this.wire);
  final String wire;

  static ProductUnit fromWire(String value) =>
      ProductUnit.values.firstWhere((u) => u.wire == value, orElse: () => ProductUnit.other);
}

/// Unit allowed when adding a cart item.
enum CartUnit {
  box('BOX'),
  packet('PACKET'),
  single('SINGLE');

  const CartUnit(this.wire);
  final String wire;

  static CartUnit fromWire(String value) =>
      CartUnit.values.firstWhere((u) => u.wire == value, orElse: () => CartUnit.box);
}

/// Sort options accepted by `/products`.
enum ProductSort {
  newest('newest'),
  priceAsc('price_asc'),
  priceDesc('price_desc'),
  featured('featured'),
  nameAsc('name_asc');

  const ProductSort(this.wire);
  final String wire;
}

/// Lightweight category reference embedded in products.
class CategoryRef {
  const CategoryRef({required this.id, required this.name, required this.slug});

  final String id;
  final String name;
  final String slug;

  factory CategoryRef.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for category ref');
    }
    return CategoryRef(
      id: requiredString(json['id'], 'category.id'),
      name: requiredString(json['name'], 'category.name'),
      slug: requiredString(json['slug'], 'category.slug'),
    );
  }
}

class ProductImage {
  const ProductImage({
    required this.id,
    required this.url,
    required this.altText,
    required this.displayOrder,
  });

  final String id;
  final String url;
  final String? altText;
  final int displayOrder;

  factory ProductImage.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for product image');
    }
    return ProductImage(
      id: requiredString(json['id'], 'image.id'),
      url: requiredString(json['url'], 'image.url'),
      altText: optionalString(json['altText']),
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
    );
  }
}

class InventoryRef {
  const InventoryRef({required this.quantity, required this.lowStockThreshold});

  final int quantity;
  final int lowStockThreshold;

  factory InventoryRef.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for inventory ref');
    }
    return InventoryRef(
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      lowStockThreshold: (json['lowStockThreshold'] as num?)?.toInt() ?? 0,
    );
  }
}

/// A product returned by the public catalog.
class Product {
  const Product({
    required this.id,
    required this.name,
    required this.slug,
    required this.shortDescription,
    required this.description,
    required this.basePrice,
    required this.mrpPrice,
    required this.sku,
    required this.unit,
    required this.piecesPerBox,
    required this.weightPerBox,
    required this.minimumAge,
    required this.isActive,
    required this.isFeatured,
    required this.isApproved,
    required this.createdAt,
    required this.updatedAt,
    required this.category,
    required this.images,
    required this.inventory,
  });

  final String id;
  final String name;
  final String slug;
  final String? shortDescription;
  final String? description;
  final String basePrice;
  final String? mrpPrice;
  final String sku;
  final ProductUnit unit;
  final int? piecesPerBox;
  final String? weightPerBox;
  final int? minimumAge;
  final bool isActive;
  final bool isFeatured;
  final bool isApproved;
  final String createdAt;
  final String updatedAt;
  final CategoryRef? category;
  final List<ProductImage> images;
  final InventoryRef? inventory;

  String? get coverUrl => images.isNotEmpty ? images.first.url : null;

  factory Product.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for product');
    }
    return Product(
      id: requiredString(json['id'], 'product.id'),
      name: requiredString(json['name'], 'product.name'),
      slug: requiredString(json['slug'], 'product.slug'),
      shortDescription: optionalString(json['shortDescription']),
      description: optionalString(json['description']),
      basePrice: requiredString(json['basePrice'], 'product.basePrice'),
      mrpPrice: optionalString(json['mrpPrice']),
      sku: requiredString(json['sku'], 'product.sku'),
      unit: ProductUnit.fromWire(json['unit'] as String? ?? 'OTHER'),
      piecesPerBox: (json['piecesPerBox'] as num?)?.toInt(),
      weightPerBox: optionalString(json['weightPerBox']),
      minimumAge: (json['minimumAge'] as num?)?.toInt(),
      isActive: json['isActive'] as bool? ?? false,
      isFeatured: json['isFeatured'] as bool? ?? false,
      isApproved: json['isApproved'] as bool? ?? false,
      createdAt: requiredString(json['createdAt'], 'product.createdAt'),
      updatedAt: requiredString(json['updatedAt'], 'product.updatedAt'),
      category: json['category'] != null ? CategoryRef.fromJson(json['category']) : null,
      images: (json['images'] as List<dynamic>?)
              ?.map((image) => ProductImage.fromJson(image))
              .toList() ??
          const [],
      inventory: json['inventory'] != null ? InventoryRef.fromJson(json['inventory']) : null,
    );
  }
}

/// `{ items, pagination }` page from `/products`.
class ProductListResponse {
  const ProductListResponse({required this.result});

  final PageResult<Product> result;

  List<Product> get items => result.items;
  Pagination get pagination => result.pagination;

  factory ProductListResponse.fromJson(dynamic json) =>
      ProductListResponse(result: PageResult.fromJson<Product>(json, Product.fromJson));
}

class Category {
  const Category({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    required this.parentId,
    required this.bannerImageUrl,
    required this.isFeatured,
    required this.isActive,
    required this.displayOrder,
    required this.productCount,
  });

  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? parentId;
  final String? bannerImageUrl;
  final bool isFeatured;
  final bool isActive;
  final int displayOrder;
  final int productCount;

  factory Category.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for category');
    }
    return Category(
      id: requiredString(json['id'], 'category.id'),
      name: requiredString(json['name'], 'category.name'),
      slug: requiredString(json['slug'], 'category.slug'),
      description: optionalString(json['description']),
      parentId: optionalString(json['parentId']),
      bannerImageUrl: optionalString(json['bannerImageUrl']),
      isFeatured: json['isFeatured'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? false,
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      productCount: (json['productCount'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Nested category tree from `/categories/tree`.
class CategoryTreeNode extends Category {
  CategoryTreeNode({
    required super.id,
    required super.name,
    required super.slug,
    required super.description,
    required super.parentId,
    required super.bannerImageUrl,
    required super.isFeatured,
    required super.isActive,
    required super.displayOrder,
    required super.productCount,
    this.children = const [],
  });

  final List<CategoryTreeNode> children;

  factory CategoryTreeNode.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for category tree node');
    }
    return CategoryTreeNode(
      id: requiredString(json['id'], 'category.id'),
      name: requiredString(json['name'], 'category.name'),
      slug: requiredString(json['slug'], 'category.slug'),
      description: optionalString(json['description']),
      parentId: optionalString(json['parentId']),
      bannerImageUrl: optionalString(json['bannerImageUrl']),
      isFeatured: json['isFeatured'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? false,
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      productCount: (json['productCount'] as num?)?.toInt() ?? 0,
      children: (json['children'] as List<dynamic>?)
              ?.map((child) => CategoryTreeNode.fromJson(child))
              .toList() ??
          const [],
    );
  }
}