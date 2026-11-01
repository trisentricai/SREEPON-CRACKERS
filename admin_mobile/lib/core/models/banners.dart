import 'package:sreepon_admin/core/utils/format.dart';
import 'orders.dart';

class Banner {
  const Banner({
    required this.id,
    required this.title,
    required this.placement,
    required this.imageUrl,
    required this.actionType,
    required this.actionTarget,
    required this.isActive,
    required this.displayOrder,
    this.description,
    this.startsAt,
    this.expiresAt,
  });

  factory Banner.fromJson(Map<String, dynamic> json) {
    return Banner(
      id: json['id'] as String,
      title: json['title'] as String?,
      placement: json['placement'] as String?,
      imageUrl: json['imageUrl'] as String?,
      actionType: json['actionType'] as String?,
      actionTarget: json['actionTarget'] as String?,
      isActive: (json['isActive'] ?? false) as bool,
      displayOrder: (json['displayOrder'] ?? 0) as int,
      description: json['description'] as String?,
      startsAt: json['startsAt'] as String?,
      expiresAt: json['expiresAt'] as String?,
    );
  }

  final String id;
  final String? title;
  final String? placement;
  final String? imageUrl;
  final String? actionType;
  final String? actionTarget;
  final bool isActive;
  final int displayOrder;
  final String? description;
  final String? startsAt;
  final String? expiresAt;
}

class BannerListResponse {
  const BannerListResponse({required this.items, required this.pagination});

  factory BannerListResponse.fromJson(Map<String, dynamic> json) {
    return BannerListResponse(
      items: (json['items'] as List<dynamic>)
          .map((e) => Banner.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: Pagination.fromJson(json['pagination'] as Map<String, dynamic>),
    );
  }

  final List<Banner> items;
  final Pagination pagination;
}
