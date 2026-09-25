import { useQuery } from '@tanstack/react-query';
import { PartyPopper, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, CategoryTreeNode, HomepageData, PublicSettings } from '@/api/types';
import { EmptyState, ErrorState, ProductCard, ProductGrid, SectionHeading, Spinner } from '@/components/storefront-ui';

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
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Spinner label="Warming up the homepage…" />
      </section>
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
          <SectionHeading title="Shop by category" />
          <CategoryGrid categories={categories.data} />
        </section>
      )}

      {sections.length === 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <EmptyState title="The catalogue is live">
            <p>Browse products and add your favourites to the cart.</p>
          </EmptyState>
        </section>
      )}
    </div>
  );
}

function HeroFallback({ storeName, tagline }: { storeName?: string; tagline?: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-ember-600 via-ember-700 to-ember-900 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-gold-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-ember-400/25 blur-3xl" />
        <Sparkles className="absolute left-10 top-12 h-6 w-6 text-gold-300/50" />
        <Sparkles className="absolute bottom-14 right-1/4 h-5 w-5 text-gold-200/40" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:py-28">
        <span className="inline-block rounded-full border border-gold-300/40 bg-gold-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-gold-200">
          Festive crackers &amp; fireworks
        </span>
        <h1 className="mt-5 font-display text-4xl font-extrabold sm:text-6xl">{storeName ?? 'SriPon'}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ember-100">{tagline ?? 'Celebrate responsibly'}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link
            to="/products"
            className="rounded-full bg-white px-7 py-3 font-semibold text-ember-800 shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-ember-50"
          >
            Shop now
          </Link>
          <Link
            to="/products"
            className="rounded-full border border-white/40 bg-white/10 px-7 py-3 font-semibold text-white backdrop-blur transition duration-300 hover:bg-white/20"
          >
            Browse all
          </Link>
        </div>
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
          <SectionHeading title={section.title ?? 'Shop by category'} />
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
          <SectionHeading title={section.title ?? 'Featured products'} to="/products" />
          <ProductGrid>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
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
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
      <div className="relative z-10 mx-auto flex min-h-[320px] max-w-7xl flex-col justify-center px-4 py-16 text-white">
        {banner.title && (
          <h2 className="max-w-xl font-display text-3xl font-extrabold sm:text-4xl">{banner.title}</h2>
        )}
        {banner.subtitle && <p className="mt-3 max-w-lg text-ember-100">{banner.subtitle}</p>}
        {banner.actionTarget && (
          <Link
            to={banner.actionTarget}
            className="mt-6 inline-block w-fit rounded-full bg-white px-7 py-2.5 font-semibold text-ember-800 shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-ember-50"
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
      className="group relative overflow-hidden rounded-xl border border-line bg-paper-strong transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      {banner.imageUrl && (
        <img src={banner.imageUrl} alt={banner.title ?? 'Promotion'} className="h-40 w-full object-cover" loading="lazy" />
      )}
      <div className="p-5">
        {banner.title && (
          <h3 className="font-display font-semibold text-ember-900 group-hover:text-ember-700">{banner.title}</h3>
        )}
        {banner.subtitle && <p className="mt-1 text-sm text-ember-900/60">{banner.subtitle}</p>}
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
          className="group flex flex-col items-center gap-3 rounded-xl border border-line bg-paper-strong p-6 text-center transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ember-100 to-gold-100 text-ember-700 transition duration-300 group-hover:scale-105"
            aria-hidden
          >
            <PartyPopper className="h-7 w-7" />
          </div>
          <p className="font-display font-semibold text-ember-900 group-hover:text-ember-700">{category.name}</p>
        </Link>
      ))}
    </div>
  );
}