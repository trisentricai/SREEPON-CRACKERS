import 'package:sreepon_admin/core/utils/format.dart';

enum HomepageSectionType {
  hero,
  featuredProducts,
  categoryGrid,
  bestSellers,
  trendingProducts,
  offers,
}

extension HomepageSectionTypeString on HomepageSectionType {
  String get value {
    switch (this) {
      case HomepageSectionType.hero:
        return 'HERO';
      case HomepageSectionType.featuredProducts:
        return 'FEATURED_PRODUCTS';
      case HomepageSectionType.categoryGrid:
        return 'CATEGORY_GRID';
      case HomepageSectionType.bestSellers:
        return 'BEST_SELLERS';
      case HomepageSectionType.trendingProducts:
        return 'TRENDING_PRODUCTS';
      case HomepageSectionType.offers:
        return 'OFFERS';
    }
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
    this.content,
  });

  factory HomepageSection.fromJson(Map<String, dynamic> json) {
    return HomepageSection(
      id: json['id'] as String,
      type: HomepageSectionType.values.firstWhere(
        (e) => e.value == (json['type'] as String),
        orElse: () => HomepageSectionType.featuredProducts,
      ),
      title: json['title'] as String?,
      displayOrder: (json['displayOrder'] ?? 0) as int,
      isActive: (json['isActive'] ?? false) as bool,
      config: json['config'] as Map<String, dynamic>?,
      content: json['content'] as Map<String, dynamic>?,
    );
  }

  final String id;
  final HomepageSectionType type;
  final String? title;
  final int displayOrder;
  final bool isActive;
  final Map<String, dynamic>? config;
  final Map<String, dynamic>? content;
}

class HomepageConfig {
  const HomepageConfig({required this.heroTitle, required this.heroTagline});

  factory HomepageConfig.fromJson(Map<String, dynamic> json) {
    return HomepageConfig(
      heroTitle: json['heroTitle'] as String?,
      heroTagline: json['heroTagline'] as String?,
    );
  }

  final String? heroTitle;
  final String? heroTagline;
}

class HomepageResponse {
  const HomepageResponse({required this.config, required this.sections});

  factory HomepageResponse.fromJson(Map<String, dynamic> json) {
    return HomepageResponse(
      config: HomepageConfig.fromJson(json['config'] as Map<String, dynamic>),
      sections: (json['sections'] as List<dynamic>)
          .map((e) => HomepageSection.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  final HomepageConfig config;
  final List<HomepageSection> sections;
}
