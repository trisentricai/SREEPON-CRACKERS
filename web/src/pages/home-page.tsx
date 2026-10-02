import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';import {
  BadgeCheck,
  Gift,
  PartyPopper,
  ReceiptIndianRupee,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/api/client';
import type { ApiEnvelope, CategoryTreeNode, HomepageData, PublicSettings } from '@/api/types';
import { ErrorState, ProductGrid, ProductGridSkeleton, Reveal, Skeleton } from '@/components/storefront-ui';
import {
  ChunkyButton,
  FunChip,
  FunHeading,
  Mascot,
  Starburst,
  StickerCard,
  StickerProductCard,
  WaveDivider,
} from '@/components/sticker-ui';

const TRUST_CHIPS: Array<{ icon: LucideIcon; label: string; tone: 'mint' | 'bubble' | 'grape' | 'candy' }> = [
  { icon: ShieldCheck, label: 'Licensed stock', tone: 'mint' },
  { icon: Truck, label: '24–48h dispatch', tone: 'bubble' },
  { icon: ReceiptIndianRupee, label: 'GST invoice', tone: 'grape' },
  { icon: BadgeCheck, label: 'CE / ISI compliant', tone: 'candy' },
];

const BUBBLE_TONES = ['bg-sunny-100', 'bg-bubble-100', 'bg-grape-100', 'bg-mint-100', 'bg-candy-100'] as const;
const BUBBLE_ICONS: LucideIcon[] = [PartyPopper, Rocket, Sparkles, Star, Zap, Gift];

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
        <section className="bg-sunny-100">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
            <div>
              <Skeleton className="h-7 w-52 rounded-full border-2 border-ink" />
              <Skeleton className="mt-5 h-14 w-full rounded-2xl border-2 border-ink" />
              <Skeleton className="mt-3 h-14 w-3/4 rounded-2xl border-2 border-ink" />
              <div className="mt-7 flex gap-4">
                <Skeleton className="h-12 w-36 rounded-full border-2 border-ink" />
                <Skeleton className="h-12 w-36 rounded-full border-2 border-ink" />
              </div>
            </div>
            <Skeleton className="h-72 w-full rounded-bubble border-2 border-ink" />
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
  const hasBackendHero = sections.some((section) => section.type === 'HERO' && section.content.banners?.length);

  return (
    <div>
      {!hasBackendHero && <StickerHero tagline={store?.tagline} />}

      {sections.map((section) => (
        <HomeSection key={section.id} section={section} />
      ))}

      {sections.length === 0 && categories.data && categories.data.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <FunHeading title="Shop by fun" subtitle="Pick your kind of boom." overline="Curated for you" />
          <CategoryBubbles categories={categories.data} />
        </section>
      )}

      {sections.length === 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <StickerCard className="flex flex-col items-center gap-4 p-10 text-center">
            <Mascot className="h-24 w-auto" />
            <p className="font-display text-xl font-extrabold text-ink">Fresh boxes landing soon!</p>
            <p className="-mt-2 font-medium text-ink-muted">Browse the full catalogue meanwhile.</p>
            <ChunkyButton to="/products">Browse all crackers</ChunkyButton>
          </StickerCard>
        </section>
      )}
    </div>
  );
}

function StickerHero({ tagline }: { tagline?: string }) {
  return (
    <section className="relative overflow-hidden bg-sunny-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:var(--background-image-sparkle)]"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="inline-flex -rotate-1 items-center gap-1.5 rounded-full border-2 border-ink bg-white px-4 py-1.5 font-display text-xs font-bold uppercase tracking-widest text-ink shadow-sticker-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Festive crackers &amp; fireworks
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-7xl">
            Let&apos;s light up{' '}
            <span className="relative inline-block">
              <span className="absolute inset-x-[-6px] bottom-1 top-[55%] -rotate-1 rounded-lg bg-candy-400/70" aria-hidden />
              <span className="relative">the fun!</span>
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-lg font-medium text-ink-muted">
            {tagline ?? 'Celebrate responsibly'} — sparklers, fountains and sky shots for every festival,
            packed safe and shipped to your door.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ChunkyButton to="/products" tone="coral">
              Shop the fun
            </ChunkyButton>
            <ChunkyButton to="/products" tone="white">
              Today&apos;s deals
            </ChunkyButton>
          </div>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {TRUST_CHIPS.map((chip) => (
              <FunChip key={chip.label} icon={chip.icon} label={chip.label} tone={chip.tone} />
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <StickerCard className="relative bg-white p-8 pt-10 text-center">
            <Mascot className="mx-auto h-52 w-auto" />
            <p className="mt-4 font-display text-2xl font-extrabold text-ink">Poppy&apos;s pick</p>
            <p className="mt-1 font-medium text-ink-muted">Sealed boxes, genuine stock, zero duds.</p>
            <ChunkyButton to="/products" tone="sunny" className="mt-5 w-full">
              Start popping
            </ChunkyButton>
            <Starburst label="30%" sub="off*" className="absolute -right-5 -top-5 animate-wiggle" />
            <span className="absolute -left-4 top-1/3 inline-flex rotate-6 items-center gap-1 rounded-full border-2 border-ink bg-mint-100 px-3 py-1 text-xs font-bold text-ink shadow-sticker-sm">
              <Truck className="h-3.5 w-3.5" /> 24–48h
            </span>
          </StickerCard>
        </div>
      </div>
      <WaveDivider fill="var(--color-background)" className="relative" />
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {banners.map((banner) => (
              <StickerBanner key={banner.id} banner={banner} />
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
          <FunHeading
            title={section.title ?? 'Shop by fun'}
            subtitle="Pick your kind of boom."
            overline="Browse the range"
          />
          <CategoryBubbles categories={categories} />
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
          <FunHeading
            title={section.title ?? 'Fresh pops'}
            subtitle="Sealed boxes, genuine stock."
            overline="Handpicked for you"
            to="/products"
          />
          <Reveal>
            <ProductGrid>
              {products.map((product) => (
                <StickerProductCard key={product.id} product={product} />
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
      <div className="relative z-10 mx-auto flex min-h-[320px] max-w-7xl flex-col justify-center px-4 py-16 text-white">
        <span className="inline-flex w-fit -rotate-1 items-center gap-1.5 rounded-lg border-2 border-ink bg-sunny-400 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-widest text-ink">
          <Sparkles className="h-3.5 w-3.5" />
          Featured deal
        </span>
        {banner.title && (
          <h2 className="mt-3 max-w-xl font-display text-3xl font-extrabold sm:text-4xl">{banner.title}</h2>
        )}
        {banner.subtitle && <p className="mt-3 max-w-lg font-medium text-ember-100">{banner.subtitle}</p>}
        {banner.actionTarget && (
          <ChunkyButton to={banner.actionTarget} tone="sunny" className="mt-6 w-fit">
            Shop now
          </ChunkyButton>
        )}
      </div>
    </section>
  );
}

function StickerBanner({
  banner,
}: {
  banner: NonNullable<HomepageData['sections'][number]['content']['banners']>[number];
}) {
  const target = banner.actionTarget ?? (banner.category?.slug ? `/products/${banner.category.slug}` : '/products');
  return (
    <StickerCard className="group relative overflow-hidden transition duration-150 hover:-translate-y-1 hover:shadow-sticker-lg">
      {banner.imageUrl && (
        <div className="m-2 overflow-hidden rounded-2xl border-2 border-ink">
          <img
            src={banner.imageUrl}
            alt={banner.title ?? 'Promotion'}
            className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-5 pt-3">
        {banner.title && (
          <h3 className="font-display text-lg font-extrabold text-ink">{banner.title}</h3>
        )}
        {banner.subtitle && <p className="mt-1 text-sm font-medium text-ink-muted">{banner.subtitle}</p>}
        <span className="mt-3 inline-block rounded-full border-2 border-ink bg-sunny-100 px-3.5 py-1 font-display text-sm font-bold text-ink shadow-sticker-sm transition duration-150 group-hover:bg-sunny-400">
          Explore →
        </span>
      </div>
      {/* whole-card link overlay without nested interactives */}
      <Link to={target} className="absolute inset-0" aria-label={banner.title ?? 'Promotion'} />
    </StickerCard>
  );
}

function CategoryBubbles({
  categories,
}: {
  categories: Array<{ name: string; slug: string; bannerImageUrl?: string | null }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category, index) => {
        const Icon = BUBBLE_ICONS[index % BUBBLE_ICONS.length];
        const tone = BUBBLE_TONES[index % BUBBLE_TONES.length];
        return (
          <Link
            key={category.slug}
            to={`/products/${category.slug}`}
            className="group flex flex-col items-center gap-3 rounded-bubble border-2 border-ink bg-white p-6 text-center shadow-sticker transition duration-150 hover:-translate-y-1 hover:rotate-[-0.5deg] hover:shadow-sticker-lg"
          >
            <span
              className={`flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink ${tone} shadow-sticker-sm transition duration-150 group-hover:scale-105`}
            >
              <Icon className="h-9 w-9 text-ink" />
            </span>
            <span className="font-display text-base font-bold text-ink">{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
}