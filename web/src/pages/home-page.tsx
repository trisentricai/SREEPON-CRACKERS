import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ArrowRight, Bag2, Location, Paper, Send, ShieldDone, Star, TicketStar, TickSquare } from 'react-iconly';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, BrandBanner, CategoryTreeNode, HomepageData, HomepageSectionType, PublicSettings } from '@/api/types';
import {
  ErrorState,
  ProductCard,
  ProductGrid,
  ProductGridSkeleton,
  Reveal,
  SectionHeading,
  Skeleton,
} from '@/components/storefront-ui';
import { SITE } from '@/config/env';
import { imagePositionCss } from '@/lib/image-position';
import { useJsonLd, usePageMeta } from '@/lib/seo';
import { visibleCategorySlugs, visibleCategoryTree } from '@/lib/categories';

const TRUST_CHIPS = [
  { icon: ShieldDone, label: 'Licensed stock' },
  { icon: Send, label: '24–48h dispatch' },
  { icon: Paper, label: 'GST invoice' },
];

/** Storefront landing page composed from the backend-designed homepage. */
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
        <section className="bg-ember-50">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center">
            <Skeleton className="mx-auto h-6 w-44 rounded-full" />
            <Skeleton className="mx-auto mt-6 h-12 w-72 rounded-xl" />
            <Skeleton className="mx-auto mt-4 h-5 w-96 max-w-full rounded-lg" />
            <div className="mx-auto mt-9 flex justify-center gap-4">
              <Skeleton className="h-11 w-32 rounded-full" />
              <Skeleton className="h-11 w-32 rounded-full" />
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-4 py-10">
          <ProductGridSkeleton />
        </section>
      </div>
    );
  }

  if (homepage.isError || settings.isError) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <ErrorState error={homepage.error ?? settings.error} />
      </section>
    );
  }

  const data = homepage.data;
  const sections = data?.sections ?? [];
  // Hidden until the tree arrives: an empty store should not advertise empty
  // categories, but a missing/failed tree should not hide everything either.
  const visibleCategories = categories.data ? visibleCategoryTree(categories.data) : [];
  const visibleSlugs = categories.data ? visibleCategorySlugs(categories.data) : undefined;
  const hasSectionHero = sections.some(
    (section) => section.type === 'HERO' && (section.content.banners?.length ?? 0) > 0,
  );
  // Grouped HOME_HERO banners render even when no HERO homepage section is
  // configured, so a banner saved in admin never silently disappears.
  const heroBanners =
    data?.banners.find((group) => group.placement === 'HOME_HERO')?.items ?? [];
  // HOME_SECONDARY banners always render in their own row directly beneath the
  // hero, even when no HERO/PROMOTION section is configured.
  const secondaryBanners =
    data?.banners.find((group) => group.placement === 'HOME_SECONDARY')?.items ?? [];

  return (
    <div>
      {!hasSectionHero && heroBanners.length === 0 ? (
        <HeroFallback storeName={store?.name} tagline={store?.tagline} />
      ) : null}

      {!hasSectionHero &&
        heroBanners.map((banner, index) => <BannerStrip key={banner.id} banner={banner} first={index === 0} />)}

      {!hasSectionHero && secondaryBanners.length > 0 && (
        <SecondaryBannerRow banners={secondaryBanners} />
      )}

      {sections.map((section) => (
        <HomeSection
          key={section.id}
          section={section}
          secondaryBanners={secondaryBanners}
          visibleSlugs={visibleSlugs}
        />
      ))}

      {sections.length === 0 && visibleCategories.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-12">
          <SectionHeading title="Shop by category" overline="Curated for you" />
          <CategoryGrid categories={visibleCategories} />
        </section>
      )}

      {sections.length === 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-12">
          <SectionHeading title="Fresh from the showroom" overline="Bestsellers" to="/products" />
          <EmptyStateSlim />
        </section>
      )}
    </div>
  );
}

function EmptyStateSlim() {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface-warm p-10 text-center">
      <p className="font-medium text-ink">The catalogue is live</p>
      <p className="mt-1 text-sm text-ink-muted">Browse products and add your favourites to the cart.</p>
    </div>
  );
}

function HeroFallback({ storeName, tagline }: { storeName?: string; tagline?: string }) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-eyebrow text-accent">Celebrate brighter</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] text-ink sm:text-7xl">
            {storeName ?? 'Sreepon'}
            <span className="block text-accent">green crackers or candles.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            {tagline ?? 'Celebrate responsibly'} — a curated range of green crackers or candles, packed with care and
            delivered safe to your door.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/products" className="pill-cta inline-flex items-center justify-center bg-accent text-white hover:bg-accent/90">
              Shop the collection
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to="/wishlist"
              className="pill-cta inline-flex items-center justify-center border border-line bg-white text-ink hover:bg-surface"
            >
              Your wishlist
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-line pt-6">
            {TRUST_CHIPS.map((chip) => (
              <span key={chip.label} className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
                <chip.icon className="h-4 w-4 text-accent" />
                {chip.label}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mx-auto flex aspect-square w-full max-w-[460px] items-center justify-center overflow-hidden rounded-3xl bg-surface">
            <div className="hero-orbit" aria-hidden />
            <div className="hero-orbit scale-[0.62]" aria-hidden />
            <div className="relative z-10 flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-md animate-float">
              <Bag2 className="h-14 w-14 text-accent" />
            </div>
            <div className="absolute bottom-8 right-6 z-10 flex items-center gap-3 rounded-2xl border border-line bg-white/90 px-4 py-3 shadow-md backdrop-blur animate-float" style={{ animationDelay: '1.6s' }}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
                <Send className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">Fast delivery</span>
                <span className="block text-xs text-ink-muted">Across India in 24–48h</span>
              </span>
            </div>
            <div className="absolute left-6 top-8 z-10 flex items-center gap-2 rounded-full border border-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm backdrop-blur">
              <TickSquare className="h-3.5 w-3.5 text-success" />
              <span>Sealed &amp; genuine</span>
            </div>
            <Location className="absolute right-10 top-14 h-5 w-5 text-accent/40" aria-hidden />
            <Star className="absolute bottom-16 left-10 h-5 w-5 text-accent/40" aria-hidden />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Render one backend-driven homepage section by type. */
const PRODUCT_SECTION_META: Partial<
  Record<HomepageSectionType, { title: string; overline: string; subtitle?: string }>
> = {
  FEATURED_PRODUCTS: { title: 'Featured products', overline: 'Handpicked for you', subtitle: 'Sealed boxes, genuine stock.' },
  BEST_SELLERS: { title: 'Best sellers', overline: 'Loved by buyers', subtitle: 'Sealed boxes, genuine stock.' },
  NEW_ARRIVALS: { title: 'New arrivals', overline: 'Fresh in stock' },
  TRENDING_PRODUCTS: {
    title: 'Trending products',
    overline: 'Trending now',
    subtitle: 'The most-wanted picks this week.',
  },
  TODAYS_OFFERS: {
    title: "Today's offers",
    overline: 'Deals on today',
    subtitle: 'Everything on markdown, biggest savings first.',
  },
  PRODUCT_CAROUSEL: { title: 'Collection', overline: 'Curated for you' },
  CUSTOM_COLLECTION: { title: 'Collection', overline: 'Curated for you' },
};

function isExternalUrl(target: string): boolean {
  return /^(?:https?:)?\/\//i.test(target);
}

/** Resolve a banner's action into an internal route or external URL, or null. */
function bannerHref(banner: BrandBanner): string | null {
  switch (banner.actionType) {
    case 'LINKED_CATEGORY':
      return banner.category?.slug ? `/products/${banner.category.slug}` : '/products';
    case 'LINKED_PRODUCT':
      if (banner.product) {
        return banner.product.categorySlug
          ? `/products/${banner.product.categorySlug}/${banner.product.slug}`
          : `/products/slug/${banner.product.slug}`;
      }
      return banner.actionTarget?.startsWith('/') ? banner.actionTarget : null;
    case 'CUSTOM_URL':
      return banner.actionTarget && (banner.actionTarget.startsWith('/') || isExternalUrl(banner.actionTarget))
        ? banner.actionTarget
        : null;
    default:
      return null;
  }
}

/** Internal routes use <Link>; external URLs need a real anchor. */
function BannerLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (isExternalUrl(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

function HomeSection({
  section,
  secondaryBanners,
  visibleSlugs,
}: {
  section: HomepageData['sections'][number];
  secondaryBanners: BrandBanner[];
  /** Slugs of categories with stock; `undefined` means "no tree yet, show all". */
  visibleSlugs?: Set<string>;
}) {
  switch (section.type) {
    case 'HERO': {
      const banners = section.content.banners ?? [];
      if (banners.length === 0) return null;
      return (
        <div>
          {banners.map((banner, index) => (
            <BannerStrip key={banner.id} banner={banner} first={index === 0} />
          ))}
          {secondaryBanners.length > 0 && <SecondaryBannerRow banners={secondaryBanners} />}
        </div>
      );
    }
    case 'PROMOTION': {
      const banners = section.content.banners ?? [];
      if (banners.length === 0) return null;
      return (
        <section className="mx-auto max-w-5xl px-4 py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {banners.map((banner) => (
              <BannerCard key={banner.id} banner={banner} />
            ))}
          </div>
        </section>
      );
    }
    case 'CATEGORY_GRID': {
      const categories = (section.content.categories ?? []).filter(
        (category) => !visibleSlugs || visibleSlugs.has(category.slug),
      );
      if (categories.length === 0) return null;
      return (
        <section className="mx-auto max-w-5xl px-4 py-10">
          <SectionHeading title={section.title ?? 'Shop by category'} overline="Browse the range" />
          <CategoryGrid categories={categories} />
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
      const meta =
        PRODUCT_SECTION_META[section.type] ?? PRODUCT_SECTION_META.PRODUCT_CAROUSEL!;
      return (
        <section className="mx-auto max-w-5xl px-4 py-10">
          <SectionHeading
            title={section.title ?? meta.title}
            subtitle={meta.subtitle}
            overline={meta.overline}
            to="/products"
          />
          <Reveal>
            <ProductGrid>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </Reveal>
        </section>
      );
    }
    default:
      return null;
  }
}

function BannerStrip({
  banner,
  first,
}: {
  banner: NonNullable<HomepageData['sections'][number]['content']['banners']>[number];
  first: boolean;
}) {
  const href = bannerHref(banner);
  return (
    <section className={`relative overflow-hidden ${first ? '' : 'mt-2'}`}>
      {banner.imageUrl && (
        <img
          src={banner.imageUrl}
          alt={banner.title ?? 'Promotion'}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: imagePositionCss(banner.objectPosition) }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-accent" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-[320px] max-w-5xl flex-col justify-center px-4 py-16 text-white sm:px-6">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-eyebrow text-flame-200">
          <Star className="h-3.5 w-3.5" />
          Featured deal
        </span>
        {banner.title && (
          <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold sm:text-4xl">{banner.title}</h2>
        )}
        {banner.subtitle && <p className="mt-3 max-w-lg text-white/80">{banner.subtitle}</p>}
        {href && (
          <BannerLink
            href={href}
            className="pill-cta mt-6 inline-flex w-fit items-center justify-center bg-accent text-white hover:bg-accent/90"
          >
            Shop now
          </BannerLink>
        )}
      </div>
    </section>
  );
}

function BannerCard({
  banner,
}: {
  banner: NonNullable<HomepageData['sections'][number]['content']['banners']>[number];
}) {
  const href = bannerHref(banner);
  const className =
    'group relative overflow-hidden rounded-3xl border border-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lifted';
  const content = (
    <>
      <div className="pointer-events-none absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-line bg-white/90 text-accent backdrop-blur" aria-hidden>
        <Star className="h-4 w-4" />
      </div>
      {banner.imageUrl && (
        <img
          src={banner.imageUrl}
          alt={banner.title ?? 'Promotion'}
          className="h-40 w-full object-cover transition duration-500 group-hover:scale-105"
          style={{ objectPosition: imagePositionCss(banner.objectPosition) }}
          loading="lazy"
        />
      )}
      <div className="p-5">
        {banner.title && (
          <h3 className="font-display text-lg font-semibold text-ink group-hover:text-accent">{banner.title}</h3>
        )}
        {banner.subtitle && <p className="mt-1 text-sm text-ink-muted">{banner.subtitle}</p>}
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent transition-transform duration-300 group-hover:translate-x-1">
          Explore <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </>
  );

  if (!href) {
    return <div className={className}>{content}</div>;
  }
  return (
    <BannerLink href={href} className={className}>
      {content}
    </BannerLink>
  );
}

/** HOME_SECONDARY banners: a responsive card row right beneath the hero. */
function SecondaryBannerRow({ banners }: { banners: BrandBanner[] }) {
  if (banners.length === 0) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} />
        ))}
      </div>
    </section>
  );
}

function CategoryGrid({
  categories,
}: {
  categories: Array<{ name: string; slug: string; bannerImageUrl?: string | null }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.slug}
          to={`/products/${category.slug}`}
          className="group flex flex-col items-center gap-3 rounded-3xl border border-line bg-white p-6 text-center shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lifted"
        >
          {category.bannerImageUrl ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface">
              <img
                src={category.bannerImageUrl}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="relative" aria-hidden>
              <div className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent transition duration-300 group-hover:scale-105">
                <TicketStar className="h-7 w-7" />
              </div>
              <Star className="absolute -right-1 -top-1 h-4 w-4 text-accent transition-transform duration-300 group-hover:rotate-45" />
            </div>
          )}
          <p className="font-display font-semibold text-ink group-hover:text-accent">{category.name}</p>
        </Link>
      ))}
    </div>
  );
}