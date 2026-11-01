import 'package:sreepon_admin/core/utils/format.dart';
import 'orders.dart';

class InventoryItem {
  const InventoryItem({
    required this.productId,
    required this.productName,
    required this.sku,
    required this.quantity,
    required this.reservedQuantity,
    required this.lowStockThreshold,
  });

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    return InventoryItem(
      productId: json['productId'] as String,
      productName: json['productName'] as String?,
      sku: json['sku'] as String?,
      quantity: (json['quantity'] ?? 0) as int,
      reservedQuantity: (json['reservedQuantity'] ?? 0) as int,
      lowStockThreshold: (json['lowStockThreshold'] ?? 0) as int,
    );
  }

  final String productId;
  final String? productName;
  final String? sku;
  final int quantity;
  final int reservedQuantity;
  final int lowStockThreshold;

  int get available => quantity - reservedQuantity;
  bool get isLowStock => available <= lowStockThreshold;
  bool get isOutOfStock => available < 1;
}

class InventoryListResponse {
  const InventoryListResponse({required this.items, required this.pagination});

  factory InventoryListResponse.fromJson(Map<String, dynamic> json) {
    return InventoryListResponse(
      items: (json['items'] as List<dynamic>)
          .map((e) => InventoryItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: Pagination.fromJson(json['pagination'] as Map<String, dynamic>),
    );
  }

  final List<InventoryItem> items;
  final Pagination pagination;
}
