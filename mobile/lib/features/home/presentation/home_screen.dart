import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/widgets/storefront.dart';
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

    return Scaffold(
      appBar: AppBar(
        title: Text(storeName),
        actions: [
          IconButton(
            tooltip: 'Wishlist',
            icon: const Icon(Icons.favorite_outline),
            onPressed: () => Navigator.of(context).pushNamed('/wishlist'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(homepageProvider),
        child: homepage.when(
          loading: () => const Center(child: CircularProgressIndicator()),
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
      case HomepageSectionType.customCollection:
      case HomepageSectionType.promotion:
        return _ProductListSection(section: section);
    }
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
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [SriPonColors.emberDeep, SriPonColors.ember900],
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (imageUrl != null)
            SriponImage(url: imageUrl)
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
        ],
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
        const SectionHeading(title: 'Shop by category'),
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
              icon: const Icon(Icons.grid_view),
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
          colors: [SriPonColors.emberDeep, SriPonColors.ember900],
        ),
      ),
      child: Column(
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
        SectionHeading(title: section.title ?? 'Shop by category'),
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
        SectionHeading(title: section.title ?? 'Featured'),
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
              ProductImage(id: p.id, url: p.image!, altText: p.imageAlt, displayOrder: 0),
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
        SectionHeading(title: section.title ?? 'Collection'),
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
              ProductImage(id: p.id, url: p.image!, altText: p.imageAlt, displayOrder: 0),
            ],
      inventory: null,
    );
  }
}
