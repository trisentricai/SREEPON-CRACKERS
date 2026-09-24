/// Homepage + banner models from `backend/src/modules/homepage` + content.
library;

import 'api_envelope.dart';
import 'catalog.dart';

enum BannerPlacement {
  homeHero('HOME_HERO'),
  homeSecondary('HOME_SECONDARY'),
  homeMiddle('HOME_MIDDLE'),
  homeBottom('HOME_BOTTOM'),
  categoryTop('CATEGORY_TOP'),
  productPromotion('PRODUCT_PROMOTION'),
  appHome('APP_HOME');

  const BannerPlacement(this.wire);
  final String wire;

  static BannerPlacement fromWire(String value) =>
      BannerPlacement.values.firstWhere((p) => p.wire == value, orElse: () => BannerPlacement.homeHero);
}

enum BannerActionType {
  linkedProduct('LINKED_PRODUCT'),
  linkedCategory('LINKED_CATEGORY'),
  customUrl('CUSTOM_URL');

  const BannerActionType(this.wire);
  final String wire;

  static BannerActionType fromWire(String value) =>
      BannerActionType.values.firstWhere((a) => a.wire == value, orElse: () => BannerActionType.customUrl);
}

class BrandBanner {
  const BrandBanner({
    required this.id,
    required this.placement,
    required this.title,
    required this.subtitle,
    required this.imageUrl,
    required this.actionType,
    required this.actionTarget,
    required this.category,
    required this.displayOrder,
    required this.startAt,
    required this.endAt,
    required this.isActive,
  });

  final String id;
  final BannerPlacement placement;
  final String? title;
  final String? subtitle;
  final String? imageUrl;
  final BannerActionType actionType;
  final String? actionTarget;
  final CategoryRef? category;
  final int displayOrder;
  final String? startAt;
  final String? endAt;
  final bool isActive;

  factory BrandBanner.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for banner');
    }
    return BrandBanner(
      id: requiredString(json['id'], 'banner.id'),
      placement: BannerPlacement.fromWire(json['placement'] as String? ?? ''),
      title: optionalString(json['title']),
      subtitle: optionalString(json['subtitle']),
      imageUrl: optionalString(json['imageUrl']),
      actionType: BannerActionType.fromWire(json['actionType'] as String? ?? ''),
      actionTarget: optionalString(json['actionTarget']),
      category: json['category'] != null ? CategoryRef.fromJson(json['category']) : null,
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      startAt: optionalString(json['startAt']),
      endAt: optionalString(json['endAt']),
      isActive: json['isActive'] as bool? ?? false,
    );
  }
}

enum HomepageSectionType {
  hero('HERO'),
  categoryGrid('CATEGORY_GRID'),
  productCarousel('PRODUCT_CAROUSEL'),
  featuredProducts('FEATURED_PRODUCTS'),
  bestSellers('BEST_SELLERS'),
  newArrivals('NEW_ARRIVALS'),
  promotion('PROMOTION'),
  customCollection('CUSTOM_COLLECTION');

  const HomepageSectionType(this.wire);
  final String wire;

  static HomepageSectionType fromWire(String value) =>
      HomepageSectionType.values.firstWhere((s) => s.wire == value, orElse: () => HomepageSectionType.hero);
}

/// Compact product card used inside homepage sections.
class HomepageProduct {
  const HomepageProduct({
    required this.id,
    required this.name,
    required this.slug,
    required this.sku,
    required this.unit,
    required this.basePrice,
    required this.mrpPrice,
    required this.shortDescription,
    required this.minimumAge,
    required this.category,
    required this.image,
    required this.imageAlt,
  });

  final String id;
  final String name;
  final String slug;
  final String sku;
  final ProductUnit unit;
  final String basePrice;
  final String? mrpPrice;
  final String? shortDescription;
  final int? minimumAge;
  final CategoryRef category;
  final String? image;
  final String? imageAlt;

  factory HomepageProduct.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for homepage product');
    }
    return HomepageProduct(
      id: requiredString(json['id'], 'hpProduct.id'),
      name: requiredString(json['name'], 'hpProduct.name'),
      slug: requiredString(json['slug'], 'hpProduct.slug'),
      sku: requiredString(json['sku'], 'hpProduct.sku'),
      unit: ProductUnit.fromWire(json['unit'] as String? ?? 'OTHER'),
      basePrice: requiredString(json['basePrice'], 'hpProduct.basePrice'),
      mrpPrice: optionalString(json['mrpPrice']),
      shortDescription: optionalString(json['shortDescription']),
      minimumAge: (json['minimumAge'] as num?)?.toInt(),
      category: CategoryRef.fromJson(json['category']),
      image: optionalString(json['image']),
      imageAlt: optionalString(json['imageAlt']),
    );
  }
}

/// Compact category card used inside homepage sections.
class HomepageCategory {
  const HomepageCategory({
    required this.id,
    required this.name,
    required this.slug,
    required this.bannerImageUrl,
  });

  final String id;
  final String name;
  final String slug;
  final String? bannerImageUrl;

  factory HomepageCategory.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for homepage category');
    }
    return HomepageCategory(
      id: requiredString(json['id'], 'hpCategory.id'),
      name: requiredString(json['name'], 'hpCategory.name'),
      slug: requiredString(json['slug'], 'hpCategory.slug'),
      bannerImageUrl: optionalString(json['bannerImageUrl']),
    );
  }
}

class HomepageSectionContent {
  const HomepageSectionContent({this.banners, this.categories, this.products});

  final List<BrandBanner>? banners;
  final List<HomepageCategory>? categories;
  final List<HomepageProduct>? products;

  factory HomepageSectionContent.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      return const HomepageSectionContent();
    }
    return HomepageSectionContent(
      banners: (json['banners'] as List<dynamic>?)
          ?.map((b) => BrandBanner.fromJson(b))
          .toList(),
      categories: (json['categories'] as List<dynamic>?)
          ?.map((c) => HomepageCategory.fromJson(c))
          .toList(),
      products: (json['products'] as List<dynamic>?)
          ?.map((p) => HomepageProduct.fromJson(p))
          .toList(),
    );
  }
}

class HomepageSection {
  const HomepageSection({
    required this.id,
    required this.type,
    required this.title,
    required this.displayOrder,
    required this.isActive,
    required this.content,
  });

  final String id;
  final HomepageSectionType type;
  final String? title;
  final int displayOrder;
  final bool isActive;
  final HomepageSectionContent content;

  factory HomepageSection.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for homepage section');
    }
    return HomepageSection(
      id: requiredString(json['id'], 'section.id'),
      type: HomepageSectionType.fromWire(json['type'] as String? ?? ''),
      title: optionalString(json['title']),
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      isActive: json['isActive'] as bool? ?? false,
      content: HomepageSectionContent.fromJson(json['content']),
    );
  }
}

class HomepageBannerGroup {
  const HomepageBannerGroup({required this.placement, required this.items});

  final BannerPlacement placement;
  final List<BrandBanner> items;

  factory HomepageBannerGroup.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for banner group');
    }
    return HomepageBannerGroup(
      placement: BannerPlacement.fromWire(json['placement'] as String? ?? ''),
      items: (json['items'] as List<dynamic>?)
              ?.map((b) => BrandBanner.fromJson(b))
              .toList() ??
          const [],
    );
  }
}

class HomepageData {
  const HomepageData({required this.sections, required this.banners});

  final List<HomepageSection> sections;
  final List<HomepageBannerGroup> banners;

  /// Banners for a placement, e.g. HERO, in display order.
  List<BrandBanner> bannersFor(BannerPlacement placement) =>
      banners.where((group) => group.placement == placement).expand((g) => g.items).toList();

  factory HomepageData.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for homepage');
    }
    return HomepageData(
      sections: (json['sections'] as List<dynamic>?)
              ?.map((s) => HomepageSection.fromJson(s))
              .toList() ??
          const [],
      banners: (json['banners'] as List<dynamic>?)
              ?.map((b) => HomepageBannerGroup.fromJson(b))
              .toList() ??
          const [],
    );
  }
}