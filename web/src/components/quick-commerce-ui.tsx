import type { FormEvent, ReactNode } from 'react';
import {
  ArrowRight,
  Bag2,
  Location,
  Search,
  Send,
  Star,
  TicketStar,
  TickSquare,
} from 'react-iconly';
import { Link } from 'react-router-dom';
import type { BrandBanner } from '@/api/types';
import { formatMoney } from '@/lib/format';
import { imagePositionCss } from '@/lib/image-position';
import { bannerHref, isExternalUrl, type CategoryTile } from '@/lib/quick-commerce';
import { cn, ProductCard, type CardProduct } from './storefront-ui';

/* ------------------------------------------------------------------ */
/* Zepto-style quick-commerce layout primitives                        */
/* ------------------------------------------------------------------ */

/** Compact top-of-home promise: location, speed and trust in one band. */
export function DeliveryStrip({ storeName, tagline }: { storeName?: string; tagline?: string }) {
  return (
    <section className="border-b border-line bg-accent-soft">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-eyebrow text-accent shadow-sm">
              <Location className="h-3.5 w-3.5" set="bold" />
              10–15 min delivery
            </span>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {storeName ?? 'Sreepon'}
              <span className="block text-accent">
                Everyday essentials, right when you need them.
              </span>
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-muted sm:text-base">
              {tagline ?? 'Your neighbourhood store, at your door in 15 minutes'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-auto">
            <PromiseChip icon={Send} label="Fresh stock" />
            <PromiseChip icon={TickSquare} label="Easy returns" />
            <PromiseChip icon={TicketStar} label="GST invoice" />
            <PromiseChip icon={Star} label="Local store" />
          </div>
        </div>
      </div>
    </section>
  );
}

function PromiseChip({ icon: Icon, label }: { icon: typeof Send; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-2 text-xs font-medium text-ink shadow-sm">
      <Icon className="h-4 w-4 text-accent" />
      {label}
    </span>
  );
}

export function CategoryRail({
  categories,
  active,
  className,
}: {
  categories: CategoryTile[];
  active?: string;
  className?: string;
}) {
  if (categories.length === 0) return null;
  return (
    <div className={cn('quick-scroll flex gap-3 overflow-x-auto pb-2', className)}>
      {categories.map((category) => {
        const selected = active === category.slug;
        return (
          <Link
            key={category.id}
            to={`/products/${category.slug}`}
            className="group flex w-[76px] shrink-0 flex-col items-center gap-2 text-center"
          >
            <span
              className={cn(
                'grid h-16 w-16 place-items-center overflow-hidden rounded-full border bg-white shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-active:scale-95',
                selected ? 'border-accent ring-2 ring-accent/20' : 'border-line',
              )}
            >
              {category.bannerImageUrl ? (
                <img
                  src={category.bannerImageUrl}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <TicketStar
                  className={cn('h-7 w-7', selected ? 'text-accent' : 'text-ink-muted')}
                />
              )}
            </span>
            <span
              className={cn(
                'line-clamp-2 text-xs font-semibold leading-tight',
                selected ? 'text-accent' : 'text-ink',
              )}
            >
              {category.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** Search field shared by the header and catalogue. */
export function QuickSearch({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search for everyday essentials…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={submit} role="search" className={cn('min-w-0', className)}>
      <label className="relative block">
        <span className="sr-only">Search products</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted/70 transition focus:border-accent focus:outline-none"
        />
      </label>
    </form>
  );
}

/** Internal routes use <Link>; external URLs need a real anchor. */
export function BannerLink({
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

/** Horizontal, image-led offer cards beneath the delivery promise. */
export function OfferStrip({ banners }: { banners: BrandBanner[] }) {
  if (banners.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-4" aria-label="Offers">
      <div className="quick-scroll flex gap-3 overflow-x-auto pb-2">
        {banners.map((banner) => {
          const href = bannerHref(banner);
          const card = (
            <>
              <div className="relative h-28 overflow-hidden bg-surface">
                {banner.imageUrl && (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title ?? 'Offer'}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    style={{ objectPosition: imagePositionCss(banner.objectPosition) }}
                    loading="lazy"
                  />
                )}
                <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                  Deal
                </span>
              </div>
              <div className="p-3">
                {banner.title && (
                  <p className="line-clamp-1 text-sm font-semibold text-ink">{banner.title}</p>
                )}
                {banner.subtitle && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{banner.subtitle}</p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                  Shop now <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </>
          );
          const className =
            'group block w-[250px] shrink-0 overflow-hidden rounded-lg border border-line bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lifted';
          return href ? (
            <BannerLink key={banner.id} href={href} className={className}>
              {card}
            </BannerLink>
          ) : (
            <div key={banner.id} className={className}>
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Zepto-style horizontal product shelf. */
export function ProductShelf({
  title,
  subtitle,
  products,
  to = '/products',
}: {
  title: string;
  subtitle?: string;
  products: CardProduct[];
  to?: string;
}) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
        </div>
        <Link
          to={to}
          className="quick-press inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft"
        >
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="quick-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {products.map((product) => (
          <div key={product.id} className="w-[164px] shrink-0 sm:w-[176px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Compact floating cart call-to-action used on every quick-commerce page. */
export function QuickCartBar({ quantity, subtotal }: { quantity: number; subtotal: string }) {
  if (quantity <= 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-3">
      <Link
        to="/cart"
        className="quick-press pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-lg border border-line bg-ink px-4 text-white shadow-lg hover:bg-ink/95"
      >
        <span className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-accent">
            <Bag2 className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-accent">
              {quantity}
            </span>
          </span>
          <span className="text-left">
            <span className="block text-sm font-semibold leading-none">View cart</span>
            <span className="mt-1 block text-[11px] text-white/70">
              {quantity} item{quantity === 1 ? '' : 's'} · delivered in 10–15 min
            </span>
          </span>
        </span>
        <span className="text-sm font-bold tabular-nums">{formatMoney(subtotal)}</span>
      </Link>
    </div>
  );
}
