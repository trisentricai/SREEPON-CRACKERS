import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bag2, TicketStar } from 'react-iconly';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type {
  ApiEnvelope,
  BrandBanner,
  CategoryTreeNode,
  HomepageData,
  HomepageSectionType,
  PublicSettings,
} from '@/api/types';
import {
  CategoryRail,
  DeliveryStrip,
  OfferStrip,
  ProductShelf,
} from '@/components/quick-commerce-ui';
import { ErrorState, ProductGridSkeletonQuick, Skeleton } from '@/components/storefront-ui';
import { SITE } from '@/config/env';
import { flattenCategories } from '@/lib/quick-commerce';
import { useJsonLd, usePageMeta } from '@/lib/seo';
import { visibleCategorySlugs, visibleCategoryTree } from '@/lib/categories';

const PRODUCT_SECTION_META: Partial<
  Record<HomepageSectionType, { title: string; subtitle?: string }>
> = {
  FEATURED_PRODUCTS: { title: 'Everyday essentials', subtitle: 'Fresh from a store near you.' },
  BEST_SELLERS: { title: 'Bestsellers', subtitle: 'Loved by your neighbours.' },
  NEW_ARRIVALS: { title: 'New arrivals', subtitle: 'Just landed in your store.' },
  TRENDING_PRODUCTS: { title: 'Trending now', subtitle: 'The most-wanted picks this week.' },
  TODAYS_OFFERS: { title: "Today's offers", subtitle: 'Biggest savings first.' },
  PRODUCT_CAROUSEL: { title: 'Collection' },
  CUSTOM_COLLECTION: { title: 'Collection' },
};

/** Storefront landing page in the Zepto-style quick-commerce layout. */
export function HomePage() {
  const homepage = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<HomepageData>>('/homepage');
      return data.data;
    },
  });

  const settings = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<PublicSettings>>('/settings/public');
      return data.data;
    },
  });

  const categories = useQuery({
    queryKey: ['public-categories-tree'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<CategoryTreeNode[]>>('/categories/tree');
      return data.data;
    },
  });

  const store = settings.data?.store;
  const socialLinks = [
    settings.data?.social.instagramUrl,
    settings.data?.social.facebookUrl,
    settings.data?.social.youtubeUrl,
    settings.data?.social.tiktokUrl,
  ].filter((url): url is string => Boolean(url));

  usePageMeta({ path: '/' });
  useJsonLd(
    'ld-store',
    settings.data
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Store',
              name: store?.name ?? SITE.name,
              url: SITE.baseUrl,
              image: `${SITE.baseUrl}/logo.webp`,
              ...(store?.tagline ? { description: store.tagline } : {}),
              ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
              ...(store?.supportEmail || store?.supportPhone
                ? {
                    contactPoint: {
                      '@type': 'ContactPoint',
                      contactType: 'customer service',
                      ...(store.supportEmail ? { email: store.supportEmail } : {}),
                      ...(store.supportPhone ? { telephone: store.supportPhone } : {}),
                    },
                  }
                : {}),
            },
            {
              '@type': 'WebSite',
              name: store?.name ?? SITE.name,
              url: SITE.baseUrl,
              potentialAction: {
                '@type': 'SearchAction',
                target: `${SITE.baseUrl}/products?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            },
          ],
        }
      : null,
  );

  if (homepage.isLoading || settings.isLoading) {
    return (
      <div>
        <section className="border-b border-line bg-accent-soft">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <Skeleton className="h-6 w-36 rounded-full" />
            <Skeleton className="mt-3 h-9 w-2/3 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-1/2 rounded-lg" />
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-4">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <div className="mt-3 flex gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-20 shrink-0 rounded-full" />
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-4">
          <ProductGridSkeletonQuick count={10} />
        </section>
      </div>
    );
  }

  if (homepage.isError || settings.isError) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <ErrorState error={homepage.error ?? settings.error} />
      </section>
    );
  }

  const sections = homepage.data?.sections ?? [];
  const categoryTree = categories.data ? visibleCategoryTree(categories.data) : [];
  const visibleSlugs = categories.data ? visibleCategorySlugs(categories.data) : undefined;
  const banners = collectBanners(homepage.data, sections);

  return (
    <div className="pb-4">
      <DeliveryStrip storeName={store?.name} tagline={store?.tagline} />

      <section className="mx-auto max-w-6xl px-4 pt-4">
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
            Shop by category
          </h2>
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <CategoryRail categories={flattenCategories(categoryTree)} />
      </section>

      <OfferStrip banners={banners} />

      {sections.map((section) => (
        <HomeSection key={section.id} section={section} visibleSlugs={visibleSlugs} />
      ))}

      {sections.length === 0 && categoryTree.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <EmptyStateSlim />
        </section>
      )}
    </div>
  );
}

function collectBanners(
  data: HomepageData | undefined,
  sections: HomepageData['sections'],
): BrandBanner[] {
  const grouped = [
    ...(data?.banners.find((group) => group.placement === 'HOME_HERO')?.items ?? []),
    ...(data?.banners.find((group) => group.placement === 'HOME_SECONDARY')?.items ?? []),
    ...sections.flatMap((section) => section.content.banners ?? []),
  ];
  const seen = new Set<string>();
  return grouped.filter((banner) => {
    if (seen.has(banner.id)) return false;
    seen.add(banner.id);
    return true;
  });
}

function EmptyStateSlim() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line bg-surface-warm p-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Bag2 className="h-6 w-6" />
      </span>
      <p className="font-medium text-ink">The catalogue is live</p>
      <p className="text-sm text-ink-muted">
        Pick a category above or{' '}
        <Link to="/products" className="font-semibold text-accent underline">
          browse everything
        </Link>
        .
      </p>
    </div>
  );
}

/** Render one backend-driven homepage section by type. */
function HomeSection({
  section,
  visibleSlugs,
}: {
  section: HomepageData['sections'][number];
  visibleSlugs?: Set<string>;
}) {
  switch (section.type) {
    case 'HERO':
    case 'PROMOTION':
      // Banners are already rendered once in OfferStrip above.
      return null;

    case 'CATEGORY_GRID': {
      const categories = (section.content.categories ?? []).filter(
        (category) => !visibleSlugs || visibleSlugs.has(category.slug),
      );
      if (categories.length === 0) return null;
      return (
        <section className="mx-auto max-w-6xl px-4 py-4">
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
              {section.title ?? 'Shop by category'}
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
              <TicketStar className="h-3.5 w-3.5 text-accent" />
              Curated for you
            </span>
          </div>
          <CategoryRail categories={categories} />
        </section>
      );
    }

    case 'FEATURED_PRODUCTS':
    case 'BEST_SELLERS':
    case 'NEW_ARRIVALS':
    case 'TRENDING_PRODUCTS':
    case 'TODAYS_OFFERS':
    case 'PRODUCT_CAROUSEL':
    case 'CUSTOM_COLLECTION': {
      const products = section.content.products ?? [];
      if (products.length === 0) return null;
      const meta = PRODUCT_SECTION_META[section.type] ?? PRODUCT_SECTION_META.PRODUCT_CAROUSEL!;
      return (
        <ProductShelf
          title={section.title ?? meta.title}
          subtitle={meta.subtitle}
          products={products}
          to={section.type === 'TODAYS_OFFERS' ? '/products?sort=price_asc' : '/products'}
        />
      );
    }

    default:
      return null;
  }
}
