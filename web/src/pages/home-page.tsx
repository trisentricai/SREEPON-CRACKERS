import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, PartyPopper, ReceiptIndianRupee, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, CategoryTreeNode, HomepageData, PublicSettings } from '@/api/types';
import {
  ErrorState,
  ProductCard,
  ProductGrid,
  ProductGridSkeleton,
  Reveal,
  SectionHeading,
  Skeleton,
} from '@/components/storefront-ui';

const TRUST_CHIPS = [
  { icon: ShieldCheck, label: 'Licensed stock' },
  { icon: Truck, label: '24–48h dispatch' },
  { icon: ReceiptIndianRupee, label: 'GST invoice' },
  { icon: BadgeCheck, label: 'CE / ISI compliant' },
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

  if (homepage.isLoading || settings.isLoading) {
    return (
      <div>
        <section className="bg-ember-50">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center">
            <Skeleton className="mx-auto h-6 w-44 rounded-full" />
            <Skeleton className="mx-auto mt-6 h-12 w-72 rounded-xl" />
            <Skeleton className="mx-auto mt-4 h-5 w-96 max-w-full rounded-lg" />
            <div className="mx-auto mt-9 flex justify-center gap-4">
              <Skeleton className="h-11 w-32 rounded-full" />
              <Skeleton className="h-11 w-32 rounded-full" />
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-10">
          <ProductGridSkeleton />
        </section>
      </div>
    );
  }

  if (homepage.isError || settings.isError) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <ErrorState error={homepage.error ?? settings.error} />
      </section>
    );
  }

  const data = homepage.data;
  const store = settings.data?.store;
  const sections = data?.sections ?? [];

  return (
    <div>
      {sections.length === 0 || sections.every((section) => section.type !== 'HERO' || !section.content.banners?.length) ? (
        <HeroFallback storeName={store?.name} tagline={store?.tagline} />
      ) : null}

      {sections.map((section) => (
        <HomeSection key={section.id} section={section} />
      ))}

      {sections.length === 0 && categories.data && categories.data.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeading title="Shop by category" overline="Curated for you" />
          <CategoryGrid categories={categories.data} />
        </section>
      )}

      {sections.length === 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <SectionHeading title="Fresh from the showroom" overline="Bestsellers" to="/products" />
          <EmptyStateSlim />
        </section>
      )}
    </div>
  );
}

function EmptyStateSlim() {
  return (
    <div className="rounded-xl border border-dashed border-ember-200 bg-ember-50/60 p-10 text-center">
      <p className="font-medium text-ember-800">The catalogue is live</p>
      <p className="mt-1 text-sm text-ember-900/60">Browse products and add your favourites to the cart.</p>
    </div>
  );
}

function HeroFallback({ storeName, tagline }: { storeName?: string; tagline?: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-coral-500 via-coral-600 to-coral-700 text-white">
      {/* Sparkle field + tall colour washes. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 [background-image:var(--background-image-sparkle)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full bg-gold-400/30 blur-3xl" />
        <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-ember-400/30 blur-3xl" />
        <Sparkles className="absolute left-10 top-12 h-6 w-6 text-gold-300/80" />
        <Sparkles className="absolute bottom-16 right-1/4 h-5 w-5 text-white/70" />
        <Sparkles className="absolute right-14 top-24 h-4 w-4 text-teal-300/80" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:py-28">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/50 bg-gold-400/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-100 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Festive crackers &amp; fireworks
          </span>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
            {storeName ?? 'SriPon'}
          </h1>
          <span className="mx-auto mt-3 block h-2 w-28 rounded-full bg-gradient-to-r from-coral-200 via-gold-300 to-coral-200" />
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ember-50/90 sm:text-lg">
            {tagline ?? 'Celebrate responsibly'} — lights, sparks and colour for every festival, delivered safe to your door.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link
              to="/products"
              className="rounded-full bg-white px-7 py-3 font-semibold text-coral-600 shadow-cta transition duration-300 hover:-translate-y-0.5 hover:bg-coral-50 active:scale-95"
            >
              Shop now
            </Link>
            <Link
              to="/wishlist"
              className="rounded-full border border-white/40 bg-white/10 px-7 py-3 font-semibold text-white backdrop-blur transition duration-300 hover:bg-white/20 active:scale-95"
            >
              Browse all
            </Link>
          </div>
        </Reveal>
        <Reveal delay={340}>
          <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/15 pt-6 text-sm">
            {TRUST_CHIPS.map((chip) => (
              <span key={chip.label} className="inline-flex items-center gap-2 font-medium text-ember-50/95">
                <chip.icon className="h-4 w-4 text-gold-300" />
                {chip.label}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Render one backend-driven homepage section by type. */
function HomeSection({ section }: { section: HomepageData['sections'][number] }) {
  switch (section.type) {
    case 'HERO': {
      const banners = section.content.banners ?? [];
      if (banners.length === 0) return null;
      return (
        <div>
          {banners.map((banner, index) => (
            <BannerStrip key={banner.id} banner={banner} first={index === 0} />
          ))}
        </div>
      );
    }
    case 'PROMOTION': {
      const banners = section.content.banners ?? [];
      if (banners.length === 0) return null;
      return (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {banners.map((banner) => (
              <BannerCard key={banner.id} banner={banner} />
            ))}
          </div>
        </section>
      );
    }
    case 'CATEGORY_GRID': {
      const categories = section.content.categories ?? [];
      if (categories.length === 0) return null;
      return (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <SectionHeading title={section.title ?? 'Shop by category'} overline="Browse the range" />
          <CategoryGrid categories={categories} />
        </section>
      );
    }
    case 'FEATURED_PRODUCTS':
    case 'BEST_SELLERS':
    case 'NEW_ARRIVALS':
    case 'PRODUCT_CAROUSEL':
    case 'CUSTOM_COLLECTION': {
      const products = section.content.products ?? [];
      if (products.length === 0) return null;
      return (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <SectionHeading
            title={section.title ?? 'Featured products'}
            subtitle="Sealed boxes, genuine stock."
            overline="Handpicked for you"
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
  return (
    <section className={`relative overflow-hidden ${first ? '' : 'mt-2'}`}>
      {banner.imageUrl && (
        <img src={banner.imageUrl} alt={banner.title ?? 'Promotion'} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-gold-400 via-coral-400 to-teal-400" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-[320px] max-w-7xl flex-col justify-center px-4 py-16 text-white">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-eyebrow text-gold-300">
          <Sparkles className="h-3.5 w-3.5" />
          Featured deal
        </span>
        {banner.title && (
          <h2 className="mt-2 max-w-xl font-display text-3xl font-extrabold sm:text-4xl">{banner.title}</h2>
        )}
        {banner.subtitle && <p className="mt-3 max-w-lg text-ember-100">{banner.subtitle}</p>}
        {banner.actionTarget && (
          <Link
            to={banner.actionTarget}
            className="mt-6 inline-block w-fit rounded-full bg-gold-500 px-7 py-2.5 font-semibold text-ink shadow-cta transition duration-300 hover:-translate-y-0.5 hover:bg-gold-400 active:scale-95"
          >
            Shop now
          </Link>
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
  const target = banner.actionTarget ?? (banner.category?.slug ? `/products/${banner.category.slug}` : '/products');
  return (
    <Link
      to={target}
      className="group relative overflow-hidden rounded-xl border border-line bg-paper-strong shadow-card transition duration-300 hover:-translate-y-1 hover:border-coral-200 hover:shadow-lifted"
    >
      <div className="pointer-events-none absolute right-3 top-3 h-10 w-10 rounded-full border border-gold-300/70 bg-gold-100/40 flex items-center justify-center" aria-hidden>
        <Sparkles className="h-4 w-4 text-gold-600" />
      </div>
      {banner.imageUrl && (
        <img src={banner.imageUrl} alt={banner.title ?? 'Promotion'} className="h-40 w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
      )}
      <div className="p-5">
        {banner.title && (
          <h3 className="font-display text-lg font-semibold text-ember-900 group-hover:text-coral-600">{banner.title}</h3>
        )}
        {banner.subtitle && <p className="mt-1 text-sm text-ember-900/60">{banner.subtitle}</p>}
        <span className="mt-3 inline-block text-sm font-semibold text-coral-600 transition-transform duration-300 group-hover:translate-x-1">
          Explore →
        </span>
      </div>
    </Link>
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
          className="group flex flex-col items-center gap-3 rounded-xl border border-line bg-paper-strong p-6 text-center shadow-card transition duration-300 hover:-translate-y-1 hover:border-coral-200 hover:shadow-lifted"
        >
          <div className="relative" aria-hidden>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-coral-100 to-gold-100 text-coral-600 transition duration-300 group-hover:scale-105">
              <PartyPopper className="h-7 w-7" />
            </div>
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-gold-500 transition-transform duration-300 group-hover:rotate-45" />
          </div>
          <p className="font-display font-semibold text-ember-900 group-hover:text-coral-600">{category.name}</p>
        </Link>
      ))}
    </div>
  );
}