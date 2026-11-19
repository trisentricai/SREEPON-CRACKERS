import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Heart, Plus, TicketStar } from 'react-iconly';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart } from '@/api/types';
import { useAuth } from '@/features/auth/context/auth-context';
import { isPhaseStubError } from '../pages/phase-state';
import { discountPercent, formatMoney, formatUnit } from '../lib/format';
import { imagePositionCss } from '../lib/image-position';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* Motion + loading primitives                                         */
/* ------------------------------------------------------------------ */

/** Fade-up reveal on scroll (IntersectionObserver, no library). */
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(
    () =>
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window),
  );

  useEffect(() => {
    const el = ref.current;
    if (shown || !el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(14px)',
        transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        transitionDelay: shown ? `${delay}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
}

/** Skeleton shimmer block (shimmer is disabled under prefers-reduced-motion). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('shimmer rounded-lg', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-5">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Brand mark                                                          */
/* ------------------------------------------------------------------ */

export function BrandMark({ name, to = '/', light = false }: { name: string; to?: string; light?: boolean }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label={name}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-ink shadow-sm transition duration-300 group-hover:scale-105">
        <img src="/logo.webp" alt="" className="h-5 w-5 rounded object-contain" />
      </span>
      <span
        className={cn(
          'text-[21px] font-bold leading-none tracking-tight',
          light ? 'text-white' : 'text-ink',
        )}
      >
        {name}
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-ink-muted">
      <svg className="h-8 w-8 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  if (isPhaseStubError(error)) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-6 text-sm text-ink-muted">
        This section comes online with the feature phases that follow Phase 1 scaffolding.
      </div>
    );
  }
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div className="rounded-3xl border border-danger/20 bg-red-50 p-6 text-sm text-danger">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface-warm p-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-muted">{children}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'orange' | 'gold';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface text-ink',
    green: 'bg-success-soft text-success',
    red: 'bg-red-50 text-danger',
    amber: 'bg-amber-50 text-warning',
    blue: 'bg-accent-soft text-accent',
    orange: 'bg-accent text-white',
    gold: 'bg-accent-soft text-accent',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function SectionHeading({
  title,
  subtitle,
  to,
  overline,
}: {
  title: string;
  subtitle?: string;
  to?: string;
  overline?: string;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <Reveal className="min-w-0">
        {overline && (
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-6 bg-accent" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-eyebrow text-accent">{overline}</p>
          </div>
        )}
        <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 text-base text-ink-muted">{subtitle}</p>}
      </Reveal>
      {to && (
        <Link
          to={to}
          className="group/see inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-accent shadow-sm transition duration-200 hover:bg-accent-soft active:scale-95"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/see:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product card                                                        */
/* ------------------------------------------------------------------ */

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  basePrice: string;
  mrpPrice: string | null;
  unit: string;
  shortDescription?: string | null;
  image?: string | null;
  imagePosition?: string | null;
  images?: Array<{
    id: string;
    url: string;
    altText: string | null;
    displayOrder: number;
    objectPosition?: string | null;
  }>;
  category?: { slug: string; name: string } | { id: string; slug: string; name: string } | null;
  inStock?: boolean | null;
};

function imageOf(product: CardProduct): string | null {
  if (product.image) return product.image;
  if (product.images && product.images.length > 0) return product.images[0].url;
  return null;
}

function positionOf(product: CardProduct): string {
  if (product.imagePosition) return imagePositionCss(product.imagePosition);
  if (product.images && product.images.length > 0) return imagePositionCss(product.images[0].objectPosition);
  return 'center';
}

function cartUnitOf(unit: string): string {
  return unit === 'BOX' || unit === 'PACKET' || unit === 'SINGLE' ? unit : 'BOX';
}

export function ProductCard({ product }: { product: CardProduct }) {
  const image = imageOf(product);
  const discount = discountPercent(product.basePrice, product.mrpPrice);
  const categoryHref = product.category?.slug
    ? `/products/${product.category.slug}/${product.slug}`
    : `/products/slug/${product.slug}`;
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [wished, setWished] = useState(false);

  const addToWishlist = useMutation({
    mutationFn: async () => {
      await api.post<ApiEnvelope<{ item: unknown; created: boolean }>>('/wishlist/items', { productId: product.id });
      return true;
    },
    onSuccess: () => {
      setWished(true);
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const addToCart = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiEnvelope<Cart>>('/cart/items', {
        productId: product.id,
        quantity: 1,
        unit: cartUnitOf(product.unit),
      });
      return data.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const requestAuth = () => navigate('/profile');

  const onWishlist = () => {
    if (!isAuthenticated) return requestAuth();
    void addToWishlist.mutate();
  };

  const onQuickAdd = () => {
    if (!isAuthenticated) return requestAuth();
    void addToCart.mutate();
  };

  return (
    <div className="group relative">
      <Link
        to={categoryHref}
        className="flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lifted"
      >
        <div className="relative aspect-square overflow-hidden bg-surface">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              style={{ objectPosition: positionOf(product) }}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center" aria-hidden>
              <TicketStar className="h-12 w-12 text-accent/30" />
            </div>
          )}
          {discount !== null && (
            <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
              {discount}% off
            </span>
          )}
          {product.inStock === false && (
            <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">
              Out of stock
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5 pb-[72px]">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.06em] text-accent">
              {product.category?.name ?? formatUnit(product.unit)}
            </p>
            {product.inStock ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                In stock
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-ink group-hover:text-accent">
            {product.name}
          </h3>
          {product.shortDescription && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">{product.shortDescription}</p>
          )}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-ink">{formatMoney(product.basePrice)}</span>
            {product.mrpPrice && (
              <span className="text-xs text-ink-muted line-through">{formatMoney(product.mrpPrice)}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Quick actions are siblings of the card link — never nested interactive elements. */}
      <button
        type="button"
        onClick={onWishlist}
        aria-label={wished ? 'Added to wishlist' : 'Add to wishlist'}
        className={cn(
          'absolute right-2.5 top-2.5 z-10 flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition duration-200 hover:scale-105 active:scale-95',
          wished ? 'bg-accent text-white' : 'bg-white/90 text-ink backdrop-blur hover:text-accent',
        )}
      >
        <Heart className="h-4 w-4" filled={wished} />
      </button>
      <button
        type="button"
        onClick={onQuickAdd}
        disabled={addToCart.isPending}
        aria-label={`Add ${product.name} to cart`}
        className="absolute bottom-4 right-4 z-10 inline-flex h-11 min-w-[76px] items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-sm font-bold text-white shadow-md transition duration-200 hover:bg-ink active:scale-95 disabled:opacity-60"
      >
        {addToCart.isPending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <>
            <Plus className="h-4 w-4" stroke="bold" />
            Add
          </>
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sectional grid helpers                                              */
/* ------------------------------------------------------------------ */

export function ProductGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

/** Wrap a page that requires a signed-in customer with an honest prompt. */
export function AuthGate({ isAuthenticated, isLoading, children, title }: { isAuthenticated: boolean; isLoading: boolean; children: ReactNode; title: string }) {
  if (isLoading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <Spinner label="Checking your session…" />
      </section>
    );
  }
  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16">
        <EmptyState title={title}>
          <p className="mt-3">
            <Link to="/profile" className="font-medium text-accent underline">
              Sign in
            </Link>{' '}
            to continue.
          </p>
        </EmptyState>
      </section>
    );
  }
  return <>{children}</>;
}
