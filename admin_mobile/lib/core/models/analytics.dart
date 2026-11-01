import 'package:sreepon_admin/core/utils/format.dart';

class RevenuePoint {
  const RevenuePoint({required this.day, required this.revenue, required this.orders});

  factory RevenuePoint.fromJson(Map<String, dynamic> json) {
    return RevenuePoint(
      day: json['day'] as String,
      revenue: (json['revenue'] ?? '0.00').toString(),
      orders: (json['orders'] ?? 0) as int,
    );
  }

  final String day;
  final String revenue;
  final int orders;
}

class OrdersPoint {
  const OrdersPoint({required this.day, required this.orders, required this.paid, required this.unpaid});

  factory OrdersPoint.fromJson(Map<String, dynamic> json) {
    return OrdersPoint(
      day: json['day'] as String,
      orders: (json['orders'] ?? 0) as int,
      paid: (json['paid'] ?? 0) as int,
      unpaid: (json['unpaid'] ?? 0) as int,
    );
  }

  final String day;
  final int orders;
  final int paid;
  final int unpaid;
}

class TopProduct {
  const TopProduct({required this.productId, required this.name, required this.sku, required this.units, required this.revenue});

  factory TopProduct.fromJson(Map<String, dynamic> json) {
    return TopProduct(
      productId: json['productId'] as String,
      name: json['name'] as String?,
      sku: json['sku'] as String?,
      units: (json['units'] ?? 0) as int,
      revenue: (json['revenue'] ?? '0.00').toString(),
    );
  }

  final String productId;
  final String? name;
  final String? sku;
  final int units;
  final String revenue;
}

class CategoryPerformance {
  const CategoryPerformance({required this.categoryId, required this.name, required this.slug, required this.units, required this.revenue});

  factory CategoryPerformance.fromJson(Map<String, dynamic> json) {
    return CategoryPerformance(
      categoryId: json['categoryId'] as String,
      name: json['name'] as String?,
      slug: json['slug'] as String?,
      units: (json['units'] ?? 0) as int,
      revenue: (json['revenue'] ?? '0.00').toString(),
    );
  }

  final String categoryId;
  final String? name;
  final String? slug;
  final int units;
  final String revenue;
}

class AnalyticsData {
  const AnalyticsData({
    required this.revenue,
    required this.orders,
    required this.topProducts,
    required this.categories,
  });

  factory AnalyticsData.fromJson(Map<String, dynamic> json) {
    return AnalyticsData(
      revenue: (json['revenue'] as List<dynamic>)
          .map((e) => RevenuePoint.fromJson(e as Map<String, dynamic>))
          .toList(),
      orders: (json['orders'] as List<dynamic>)
          .map((e) => OrdersPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
      topProducts: (json['topProducts'] as List<dynamic>)
          .map((e) => TopProduct.fromJson(e as Map<String, dynamic>))
          .toList(),
      categories: (json['categories'] as List<dynamic>)
          .map((e) => CategoryPerformance.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  final List<RevenuePoint> revenue;
  final List<OrdersPoint> orders;
  final List<TopProduct> topProducts;
  final List<CategoryPerformance> categories;
}
