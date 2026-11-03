/// Homepage composer models.
///
/// Mirrors the backend enums in `backend/src/types/enums.ts` — every section
/// type the storefront understands must be listed here, otherwise editing a
/// section would round-trip it to the wrong type.
enum HomepageSectionType {
  hero,
  categoryGrid,
  productCarousel,
  featuredProducts,
  bestSellers,
  newArrivals,
  trendingProducts,
  todaysOffers,
  promotion,
  customCollection,
}

extension HomepageSectionTypeX on HomepageSectionType {
  String get value {
    switch (this) {
      case HomepageSectionType.hero:
        return 'HERO';
      case HomepageSectionType.categoryGrid:
        return 'CATEGORY_GRID';
      case HomepageSectionType.productCarousel:
        return 'PRODUCT_CAROUSEL';
      case HomepageSectionType.featuredProducts:
        return 'FEATURED_PRODUCTS';
      case HomepageSectionType.bestSellers:
        return 'BEST_SELLERS';
      case HomepageSectionType.newArrivals:
        return 'NEW_ARRIVALS';
      case HomepageSectionType.trendingProducts:
        return 'TRENDING_PRODUCTS';
      case HomepageSectionType.todaysOffers:
        return 'TODAYS_OFFERS';
      case HomepageSectionType.promotion:
        return 'PROMOTION';
      case HomepageSectionType.customCollection:
        return 'CUSTOM_COLLECTION';
    }
  }

  String get label {
    switch (this) {
      case HomepageSectionType.hero:
        return 'Hero banner';
      case HomepageSectionType.categoryGrid:
        return 'Category grid';
      case HomepageSectionType.productCarousel:
        return 'Product carousel (handpicked)';
      case HomepageSectionType.featuredProducts:
        return 'Featured products';
      case HomepageSectionType.bestSellers:
        return 'Best sellers';
      case HomepageSectionType.newArrivals:
        return 'New arrivals';
      case HomepageSectionType.trendingProducts:
        return 'Trending products';
      case HomepageSectionType.todaysOffers:
        return "Today's offers";
      case HomepageSectionType.promotion:
        return 'Promotion banners';
      case HomepageSectionType.customCollection:
        return 'Custom collection (handpicked)';
    }
  }

  /// Sections whose products are picked by hand instead of auto-resolved.
  bool get requiresProductIds =>
      this == HomepageSectionType.productCarousel || this == HomepageSectionType.customCollection;

  /// Sections that accept a `limit` in their config.
  bool get supportsLimit =>
      this == HomepageSectionType.featuredProducts ||
      this == HomepageSectionType.bestSellers ||
      this == HomepageSectionType.newArrivals ||
      this == HomepageSectionType.trendingProducts ||
      this == HomepageSectionType.todaysOffers ||
      this == HomepageSectionType.productCarousel ||
      this == HomepageSectionType.customCollection;

  static HomepageSectionType fromValue(String? value) {
    return HomepageSectionType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => HomepageSectionType.trendingProducts,
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
    this.config,
  });

  factory HomepageSection.fromJson(Map<String, dynamic> json) {
    return HomepageSection(
      id: json['id'] as String,
      type: HomepageSectionTypeX.fromValue(json['type'] as String?),
      title: json['title'] as String?,
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      isActive: json['isActive'] == true,
      config: json['config'] is Map<String, dynamic>
          ? json['config'] as Map<String, dynamic>
          : null,
    );
  }

  final String id;
  final HomepageSectionType type;
  final String? title;
  final int displayOrder;
  final bool isActive;
  final Map<String, dynamic>? config;

  String get displayTitle =>
      (title == null || title!.isEmpty) ? type.label : title!;
}

class HomepageResponse {
  const HomepageResponse({required this.config, required this.sections});

  /// Raw `homepage` site setting so unknown keys survive a round-trip.
  final Map<String, dynamic> config;
  final List<HomepageSection> sections;

  String? get heroTitle => config['heroTitle'] as String?;
  String? get heroTagline => config['heroTagline'] as String?;
}
