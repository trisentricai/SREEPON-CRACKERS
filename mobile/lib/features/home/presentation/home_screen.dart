import 'package:flutter/material.dart';
import 'package:flutter_iconly_plus/flutter_iconly_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/models/models.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/widgets/storefront.dart';
import '../../../core/widgets/widgets.dart';
import '../../products/presentation/product_detail_screen.dart';
import '../../products/presentation/product_list_screen.dart';

/// Home tab: hero + category banners from `/homepage`, a category rail, and
/// the admin-configured product sections (featured, best sellers, new
/// arrivals, custom collections, product carousels).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homepage = ref.watch(homepageProvider);
    final settings = ref.watch(publicSettingsProvider);
    final storeName = settings.value?.store.name ?? 'SriPon';
    final cart = ref.watch(cartProvider);
    final cartCount = cart.asData?.value.totalQuantity ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [SriPonColors.flame500, SriPonColors.flame700],
                ),
                borderRadius: BorderRadius.circular(9),
              ),
              child: const Icon(IconlyBold.ticket_star, color: Colors.white, size: 17),
            ),
            const SizedBox(width: 10),
            Text(
              storeName,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Wishlist',
            icon: const Icon(IconlyLight.heart),
            onPressed: () => Navigator.of(context).pushNamed('/wishlist'),
          ),
          IconButton(
            tooltip: 'Cart',
            onPressed: () => Navigator.of(context).pushNamed('/cart'),
            icon: Badge.count(
              count: cartCount,
              isLabelVisible: cartCount > 0,
              child: const Icon(IconlyLight.bag_2),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(homepageProvider),
        child: homepage.when(
          loading: () => const _HomeSkeleton(),
          error: (error, stack) => ErrorView(
            error: error,
            onRetry: () => ref.invalidate(homepageProvider),
          ),
          data: (data) => _buildContent(context, data),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, HomepageData data) {
    final sections = data.sections.where((section) => section.isActive).toList()
      ..sort((a, b) => a.displayOrder.compareTo(b.displayOrder));
    final hero = data.bannersFor(BannerPlacement.homeHero);

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const _TrustChips(),
        if (hero.isNotEmpty) _HeroBanner(banners: hero),
        ...sections.map((section) => _buildSection(context, section)),
        if (sections.isEmpty) const _HomeFallback(),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildSection(BuildContext context, HomepageSection section) {
    switch (section.type) {
      case HomepageSectionType.hero:
      case HomepageSectionType.productCarousel:
        return _ProductCarouselSection(section: section);
      case HomepageSectionType.categoryGrid:
        return _CategoryGridSection(section: section);
      case HomepageSectionType.featuredProducts:
      case HomepageSectionType.bestSellers:
      case HomepageSectionType.newArrivals:
      case HomepageSectionType.trendingProducts:
      case HomepageSectionType.todaysOffers:
      case HomepageSectionType.customCollection:
        return _ProductListSection(section: section);
      case HomepageSectionType.promotion:
        return _PromoBannersSection(section: section);
    }
  }
}

/// Slim scrolling strip of trust chips (parity with the web USP ribbon).
class _TrustChips extends StatelessWidget {
  const _TrustChips();

  static const _items = <(IconData, String)>[
    (IconlyLight.shield_done, 'Licensed stock'),
    (IconlyLight.send, '24–48h dispatch'),
    (IconlyLight.paper, 'GST invoice'),
    (IconlyLight.tick_square, 'CE / ISI'),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 38,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        scrollDirection: Axis.horizontal,
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final (icon, label) = _items[index];
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: SriPonColors.indigo100.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 14, color: SriPonColors.indigo700),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: SriPonColors.indigo700,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Shimmer placeholder while the homepage payload loads.
class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        const SizedBox(height: 150, child: SriPonShimmer(borderRadius: 16)),
        const SizedBox(height: 24),
        const Center(
          child: SizedBox(width: 36, height: 8, child: SriPonShimmer(borderRadius: 4)),
        ),
        const SizedBox(height: 16),
        const SizedBox(width: 200, height: 20, child: SriPonShimmer(borderRadius: 10)),
        const SizedBox(height: 14),
        Row(
          children: [
            for (var i = 0; i < 3; i++) ...[
              Expanded(
                child: SizedBox(height: 210, child: SriPonShimmer(borderRadius: 14)),
              ),
              if (i < 2) const SizedBox(width: 12),
            ],
          ],
        ),
        const SizedBox(height: 24),
        const SizedBox(width: 200, height: 20, child: SriPonShimmer(borderRadius: 10)),
        const SizedBox(height: 14),
        Row(
          children: [
            for (var i = 0; i < 3; i++) ...[
              Expanded(
                child: SizedBox(height: 210, child: SriPonShimmer(borderRadius: 14)),
              ),
              if (i < 2) const SizedBox(width: 12),
            ],
          ],
        ),
      ],
    );
  }
}

class _HeroBanner extends StatefulWidget {
  const _HeroBanner({required this.banners});

  final List<BrandBanner> banners;

  @override
  State<_HeroBanner> createState() => _HeroBannerState();
}

class _HeroBannerState extends State<_HeroBanner> {
  int _page = 0;

  @override
  Widget build(BuildContext context) {
    final banners = widget.banners;
    if (banners.isEmpty) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        SizedBox(
          height: 180,
          child: PageView.builder(
            itemCount: banners.length,
            onPageChanged: (index) => setState(() => _page = index),
            itemBuilder: (context, index) => _HeroSlide(banner: banners[index]),
          ),
        ),
        if (banners.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < banners.length; i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: i == _page ? 18 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: i == _page ? scheme.primary : scheme.outlineVariant,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _HeroSlide extends StatelessWidget {
  const _HeroSlide({required this.banner});

  final BrandBanner banner;

  @override
  Widget build(BuildContext context) {
    final imageUrl = banner.imageUrl;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: _bannerHasAction(banner) ? () => _openBanner(context, banner) : null,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 8, 16, 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [SriPonColors.flame600, SriPonColors.flame700],
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (imageUrl != null)
              SriponImage(url: imageUrl, alignment: imagePositionAlignment(banner.objectPosition))
            else
              Container(
                padding: const EdgeInsets.all(20),
                alignment: Alignment.centerLeft,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      banner.title ?? 'Season’s festive collection',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    if (banner.subtitle != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        banner.subtitle!,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.white.withValues(alpha: 0.85),
                            ),
                      ),
                    ],
                  ],
                ),
              ),
            const Positioned(
              right: 22,
              top: 18,
              child: Icon(IconlyBold.star, size: 18, color: Colors.white),
            ),
            const Positioned(
              right: 40,
              bottom: 16,
              child: Icon(IconlyBold.star, size: 14, color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeFallback extends ConsumerWidget {
  const _HomeFallback();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(categoriesTreeProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _FallbackHero(),
        const SectionHeading(title: 'Shop by category', overline: 'Curated for you'),
        categories.when(
          loading: () => const SizedBox(
            height: 96,
            child: Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))),
          ),
          error: (_, __) => const SizedBox.shrink(),
          data: (tree) {
            final tiles = _activeCategories(tree);
            if (tiles.isEmpty) return const SizedBox.shrink();
            return SizedBox(
              height: 100,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: tiles.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final category = tiles[index];
                  return CategoryTile(
                    name: category.name,
                    imageUrl: category.bannerImageUrl,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => ProductListScreen(categorySlug: category.slug, title: category.name),
                      ),
                    ),
                  );
                },
              ),
            );
          },
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const ProductListScreen()),
              ),
              icon: const Icon(IconlyLight.category),
              label: const Text('Browse all products'),
            ),
          ),
        ),
      ],
    );
  }

  static List<CategoryTreeNode> _activeCategories(List<CategoryTreeNode> tree) {
    final result = <CategoryTreeNode>[];
    for (final node in tree) {
      if (node.productCount > 0 && node.isActive) {
        result.add(node);
      }
      for (final child in node.children) {
        if (child.productCount > 0 && child.isActive) {
          result.add(child);
        }
      }
    }
    return result;
  }
}

/// Internal mobile routes a banner action can target (explicit CUSTOM_URL paths).
String? _internalBannerPath(String? target) {
  if (target == null || target.isEmpty) return null;
  final route = target.startsWith('/') ? target : '/$target';
  switch (route) {
    case '/cart':
    case '/wishlist':
    case '/profile':
    case '/orders':
    case '/checkout':
      return route;
    default:
      return null;
  }
}

bool _isExternalUrl(String target) {
  final uri = Uri.tryParse(target);
  return uri != null && uri.hasScheme && (uri.scheme == 'http' || uri.scheme == 'https');
}

/// Whether a banner's action resolves to something the user can tap.
bool _bannerHasAction(BrandBanner banner) {
  switch (banner.actionType) {
    case BannerActionType.linkedCategory:
      return banner.category != null;
    case BannerActionType.linkedProduct:
      if (banner.product != null) return true;
      return _internalBannerPath(banner.actionTarget) != null;
    case BannerActionType.customUrl:
      final target = banner.actionTarget;
      if (target == null || target.isEmpty) return false;
      return _isExternalUrl(target) || _internalBannerPath(target) != null;
  }
}

/// Navigate to a banner's destination: category list, product page, internal
/// route, or external URL (opened in the system browser).
Future<void> _openBanner(BuildContext context, BrandBanner banner) async {
  switch (banner.actionType) {
    case BannerActionType.linkedCategory:
      final category = banner.category;
      if (category == null) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ProductListScreen(categorySlug: category.slug, title: category.name),
        ),
      );
      return;
    case BannerActionType.linkedProduct:
      final product = banner.product;
      if (product != null && product.slug.isNotEmpty) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => ProductDetailScreen(slug: product.slug)),
        );
        return;
      }
      final internalRoute = _internalBannerPath(banner.actionTarget);
      if (internalRoute != null) {
        await Navigator.of(context).pushNamed(internalRoute);
      }
      return;
    case BannerActionType.customUrl:
      final target = banner.actionTarget;
      if (target == null || target.isEmpty) return;
      if (_isExternalUrl(target)) {
        final uri = Uri.parse(target);
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return;
      }
      final internalRoute = _internalBannerPath(target);
      if (internalRoute != null) {
        await Navigator.of(context).pushNamed(internalRoute);
      }
  }
}

/// Renders the admin-configured `PROMOTION` section: stacked banner cards,
/// each tappable via its action.
class _PromoBannersSection extends StatelessWidget {
  const _PromoBannersSection({required this.section});

  final HomepageSection section;

  @override
  Widget build(BuildContext context) {
    final banners = section.content.banners ?? const <BrandBanner>[];
    if (banners.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeading(title: section.title ?? 'Today’s deals', overline: 'Special offers'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: [
              for (var i = 0; i < banners.length; i++) ...[
                _PromoBannerCard(banner: banners[i]),
                if (i != banners.length - 1) const SizedBox(height: 12),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _PromoBannerCard extends StatelessWidget {
  const _PromoBannerCard({required this.banner});

  final BrandBanner banner;

  @override
  Widget build(BuildContext context) {
    final imageUrl = banner.imageUrl;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: _bannerHasAction(banner) ? () => _openBanner(context, banner) : null,
        child: Container(
          height: 150,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [SriPonColors.flame600, SriPonColors.flame700],
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (imageUrl != null)
                SriponImage(url: imageUrl, alignment: imagePositionAlignment(banner.objectPosition))
              else
                Align(
                  alignment: Alignment.centerLeft,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          banner.title ?? 'Special offer',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        if (banner.subtitle != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            banner.subtitle!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.white.withValues(alpha: 0.85),
                                ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              if (imageUrl != null && (banner.title != null || banner.subtitle != null))
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black54],
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (banner.title != null)
                          Text(
                            banner.title!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                ),
                          ),
                        if (banner.subtitle != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            banner.subtitle!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FallbackHero extends StatelessWidget {
  const _FallbackHero();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      padding: const EdgeInsets.all(20),
      height: 150,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [SriPonColors.flame600, SriPonColors.flame700],
        ),
      ),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Fresh from the factory',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                'Diwali crackers, sparklers & gift boxes — straight to your door.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
              ),
            ],
          ),
          const Positioned(right: 14, top: 14, child: Icon(IconlyBold.star, size: 18, color: Colors.white)),
        ],
      ),
    );
  }
}

class _CategoryGridSection extends ConsumerWidget {
  const _CategoryGridSection({required this.section});

  final HomepageSection section;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = section.content.categories ?? const <HomepageCategory>[];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeading(title: section.title ?? 'Shop by category', overline: 'Browse the range'),
        SizedBox(
          height: 100,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: categories.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, index) {
              final category = categories[index];
              return CategoryTile(
                name: category.name,
                imageUrl: category.bannerImageUrl,
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => ProductListScreen(categorySlug: category.slug, title: category.name),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Storefront heading defaults for each section type (overridable from the
/// admin editor through `section.title`).
String _sectionTitle(HomepageSectionType type) {
  switch (type) {
    case HomepageSectionType.trendingProducts:
      return 'Trending products';
    case HomepageSectionType.todaysOffers:
      return "Today's offers";
    case HomepageSectionType.bestSellers:
      return 'Best sellers';
    case HomepageSectionType.newArrivals:
      return 'New arrivals';
    case HomepageSectionType.featuredProducts:
      return 'Featured products';
    case HomepageSectionType.productCarousel:
    case HomepageSectionType.customCollection:
      return 'Collection';
    case HomepageSectionType.categoryGrid:
      return 'Shop by category';
    case HomepageSectionType.hero:
      return 'Featured';
    case HomepageSectionType.promotion:
      return 'Offers';
  }
}

String _sectionOverline(HomepageSectionType type) {
  switch (type) {
    case HomepageSectionType.trendingProducts:
      return 'Trending now';
    case HomepageSectionType.todaysOffers:
      return 'Deals on today';
    case HomepageSectionType.bestSellers:
      return 'Loved by buyers';
    case HomepageSectionType.newArrivals:
      return 'Fresh in stock';
    case HomepageSectionType.categoryGrid:
    case HomepageSectionType.hero:
    case HomepageSectionType.promotion:
    case HomepageSectionType.productCarousel:
    case HomepageSectionType.customCollection:
    case HomepageSectionType.featuredProducts:
      return 'Handpicked for you';
  }
}

class _ProductCarouselSection extends ConsumerWidget {
  const _ProductCarouselSection({required this.section});

  final HomepageSection section;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = section.content.products ?? const <HomepageProduct>[];
    if (products.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeading(
          title: section.title ??
              (section.type == HomepageSectionType.productCarousel ? 'Featured' : _sectionTitle(section.type)),
          overline: _sectionOverline(section.type),
        ),
        SizedBox(
          height: 230,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: products.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final product = products[index];
              return SizedBox(
                width: 150,
                child: ProductCard(
                  product: _fromHomepageProduct(product),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => ProductDetailScreen(slug: product.slug),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Product _fromHomepageProduct(HomepageProduct p) {
    return Product(
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription,
      description: null,
      basePrice: p.basePrice,
      mrpPrice: p.mrpPrice,
      sku: p.sku,
      unit: p.unit,
      piecesPerBox: null,
      weightPerBox: null,
      minimumAge: p.minimumAge,
      isActive: true,
      isFeatured: true,
      isApproved: true,
      createdAt: '',
      updatedAt: '',
      category: p.category,
      images: p.image == null
          ? const <ProductImage>[]
          : [
              ProductImage(id: p.id, url: p.image!, altText: p.imageAlt, objectPosition: p.imagePosition, displayOrder: 0),
            ],
      inventory: null,
    );
  }
}

class _ProductListSection extends ConsumerWidget {
  const _ProductListSection({required this.section});

  final HomepageSection section;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = section.content.products ?? const <HomepageProduct>[];
    if (products.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeading(
          title: section.title ?? _sectionTitle(section.type),
          overline: _sectionOverline(section.type),
        ),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.72,
          ),
          itemCount: products.length > 8 ? 8 : products.length,
          itemBuilder: (context, index) {
            final product = products[index];
            return ProductCard(
              product: _fromHomepageProduct(product),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => ProductDetailScreen(slug: product.slug),
                ),
              ),
            );
          },
        ),
        if (products.length > 8)
          TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => ProductListScreen(categorySlug: null, title: section.title ?? 'Collection'),
              ),
            ),
            child: const Text('See all'),
          ),
      ],
    );
  }

  Product _fromHomepageProduct(HomepageProduct p) {
    return Product(
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription,
      description: null,
      basePrice: p.basePrice,
      mrpPrice: p.mrpPrice,
      sku: p.sku,
      unit: p.unit,
      piecesPerBox: null,
      weightPerBox: null,
      minimumAge: p.minimumAge,
      isActive: true,
      isFeatured: true,
      isApproved: true,
      createdAt: '',
      updatedAt: '',
      category: p.category,
      images: p.image == null
          ? const <ProductImage>[]
          : [
              ProductImage(id: p.id, url: p.image!, altText: p.imageAlt, objectPosition: p.imagePosition, displayOrder: 0),
            ],
      inventory: null,
    );
  }
}
