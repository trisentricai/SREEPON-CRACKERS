import 'package:sreepon_admin/core/utils/format.dart';
import 'orders.dart';

class Coupon {
  const Coupon({
    required this.id,
    required this.code,
    required this.discountType,
    required this.discountValue,
    required this.minOrderAmount,
    required this.usageLimit,
    required this.usedCount,
    required this.startsAt,
    required this.expiresAt,
    required this.isActive,
    this.description,
  });

  factory Coupon.fromJson(Map<String, dynamic> json) {
    return Coupon(
      id: json['id'] as String,
      code: json['code'] as String,
      discountType: json['discountType'] as String?,
      discountValue: (json['discountValue'] ?? '0.00').toString(),
      minOrderAmount: (json['minOrderAmount'] ?? '0.00').toString(),
      usageLimit: (json['usageLimit'] ?? 0) as int,
      usedCount: (json['usedCount'] ?? 0) as int,
      startsAt: json['startsAt'] as String?,
      expiresAt: json['expiresAt'] as String?,
      isActive: (json['isActive'] ?? false) as bool,
      description: json['description'] as String?,
    );
  }

  final String id;
  final String code;
  final String? discountType;
  final String discountValue;
  final String minOrderAmount;
  final int usageLimit;
  final int usedCount;
  final String? startsAt;
  final String? expiresAt;
  final bool isActive;
  final String? description;

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.parse(expiresAt!).isBefore(DateTime.now());
  }
}

class CouponListResponse {
  const CouponListResponse({required this.items, required this.pagination});

  factory CouponListResponse.fromJson(Map<String, dynamic> json) {
    return CouponListResponse(
      items: (json['items'] as List<dynamic>)
          .map((e) => Coupon.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: Pagination.fromJson(json['pagination'] as Map<String, dynamic>),
    );
  }

  final List<Coupon> items;
  final Pagination pagination;
}
