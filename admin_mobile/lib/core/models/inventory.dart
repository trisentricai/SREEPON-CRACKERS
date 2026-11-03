import 'orders.dart';

/// One row of the admin inventory list.
///
/// The API returns the product nested under `product` and computes
/// `available` / `isLowStock` server-side; older flat shapes are still
/// tolerated so the app never crashes on a stale response.
class InventoryItem {
  const InventoryItem({
    required this.productId,
    required this.productName,
    required this.sku,
    required this.quantity,
    required this.reservedQuantity,
    required this.available,
    required this.lowStockThreshold,
    required this.isLowStock,
    this.unit,
    this.isActive,
  });

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'] is Map<String, dynamic>
        ? json['product'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final quantity = _asInt(json['quantity']);
    final reserved = _asInt(json['reservedQuantity']);
    final threshold = _asInt(json['lowStockThreshold']);
    final available = json['available'] != null ? _asInt(json['available']) : quantity - reserved;

    return InventoryItem(
      productId: (product['id'] ?? json['productId'] ?? '') as String,
      productName: (product['name'] ?? json['productName']) as String?,
      sku: (product['sku'] ?? json['sku']) as String?,
      quantity: quantity,
      reservedQuantity: reserved,
      available: available < 0 ? 0 : available,
      lowStockThreshold: threshold,
      isLowStock: json['isLowStock'] is bool ? json['isLowStock'] as bool : available <= threshold,
      unit: product['unit'] as String?,
      isActive: product['isActive'] as bool?,
    );
  }

  final String productId;
  final String? productName;
  final String? sku;
  final int quantity;
  final int reservedQuantity;
  final int available;
  final int lowStockThreshold;
  final bool isLowStock;
  final String? unit;
  final bool? isActive;

  bool get isOutOfStock => available < 1;
  String get displayName => (productName == null || productName!.isEmpty) ? 'Unnamed product' : productName!;
}

/// A single stock movement returned by `/admin/inventory/:productId/transactions`.
class InventoryTransaction {
  const InventoryTransaction({
    required this.id,
    required this.type,
    required this.delta,
    required this.createdAt,
    this.note,
    this.orderId,
    this.adminName,
  });

  factory InventoryTransaction.fromJson(Map<String, dynamic> json) {
    final admin = json['admin'] is Map<String, dynamic>
        ? json['admin'] as Map<String, dynamic>
        : const <String, dynamic>{};
    return InventoryTransaction(
      id: json['id'] as String,
      type: (json['type'] ?? 'ADJUSTMENT') as String,
      delta: _asInt(json['delta']),
      note: json['note'] as String?,
      orderId: json['orderId'] as String?,
      adminName: (admin['name'] ?? admin['email']) as String?,
      createdAt: json['createdAt'] as String?,
    );
  }

  final String id;
  final String type;
  final int delta;
  final String? note;
  final String? orderId;
  final String? adminName;
  final String? createdAt;
}

class InventoryListResponse {
  const InventoryListResponse({required this.items, required this.pagination});

  factory InventoryListResponse.fromJson(Map<String, dynamic> json) {
    return InventoryListResponse(
      items: ((json['items'] as List<dynamic>?) ?? const [])
          .map((e) => InventoryItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: Pagination.fromJson((json['pagination'] as Map<String, dynamic>?) ?? const {}),
    );
  }

  final List<InventoryItem> items;
  final Pagination pagination;
}

class InventoryTransactionsResponse {
  const InventoryTransactionsResponse({required this.items, required this.pagination});

  factory InventoryTransactionsResponse.fromJson(Map<String, dynamic> json) {
    return InventoryTransactionsResponse(
      items: ((json['items'] as List<dynamic>?) ?? const [])
          .map((e) => InventoryTransaction.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: Pagination.fromJson((json['pagination'] as Map<String, dynamic>?) ?? const {}),
    );
  }

  final List<InventoryTransaction> items;
  final Pagination pagination;
}

int _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}
