import 'package:sreepon_admin/core/utils/format.dart';

class OrderItem {
  const OrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.sku,
    required this.quantity,
    required this.unit,
    required this.unitPrice,
    required this.lineTotal,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] as String,
      productId: json['productId'] as String,
      productName: json['productName'] as String?,
      sku: json['sku'] as String?,
      quantity: (json['quantity'] ?? 0) as int,
      unit: json['unit'] as String?,
      unitPrice: (json['unitPrice'] ?? '0.00').toString(),
      lineTotal: (json['lineTotal'] ?? '0.00').toString(),
    );
  }

  final String id;
  final String productId;
  final String? productName;
  final String? sku;
  final int quantity;
  final String? unit;
  final String unitPrice;
  final String lineTotal;
}

class Order {
  const Order({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.paymentStatus,
    required this.grandTotal,
    required this.createdAt,
    this.currency,
    this.items,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      status: json['status'] as String?,
      paymentStatus: json['paymentStatus'] as String?,
      grandTotal: (json['grandTotal'] ?? '0.00').toString(),
      createdAt: json['createdAt'] as String?,
      currency: json['currency'] as String?,
      items: (json['items'] as List<dynamic>?)
          ?.map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  final String id;
  final String orderNumber;
  final String? status;
  final String? paymentStatus;
  final String grandTotal;
  final String? createdAt;
  final String? currency;
  final List<OrderItem>? items;
}

class OrderListResponse {
  const OrderListResponse({required this.items, required this.pagination});

  factory OrderListResponse.fromJson(Map<String, dynamic> json) {
    return OrderListResponse(
      items: (json['items'] as List<dynamic>)
          .map((e) => Order.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: Pagination.fromJson(json['pagination'] as Map<String, dynamic>),
    );
  }

  final List<Order> items;
  final Pagination pagination;
}

class Pagination {
  const Pagination({required this.page, required this.limit, required this.total, required this.pages});

  factory Pagination.fromJson(Map<String, dynamic> json) {
    return Pagination(
      page: (json['page'] ?? 1) as int,
      limit: (json['limit'] ?? 20) as int,
      total: (json['total'] ?? 0) as int,
      pages: (json['pages'] ?? 0) as int,
    );
  }

  final int page;
  final int limit;
  final int total;
  final int pages;
}
