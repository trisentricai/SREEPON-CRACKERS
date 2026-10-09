import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Heart, Plus, Star, TicketStar } from 'react-iconly';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart } from '@/api/types';
import { useAuth } from '@/features/auth/context/auth-context';
import { isPhaseStubError } from '../pages/phase-state';
import { discountPercent, formatMoney, formatUnit } from '../lib/format';

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
    <div className="overflow-hidden rounded-xl border border-line bg-paper-strong shadow-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-3">
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
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-flame-500 to-flame-700 shadow-cta transition duration-300 group-hover:scale-105">
        <TicketStar className="h-5 w-5 text-white" />
        <Star className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 text-gold-500" stroke="bold" />
      </span>
      <span className={cn('font-display text-xl font-bold tracking-display', light ? 'text-white' : 'text-flame-600')}>
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
    <div className="flex flex-col items-center gap-3 py-16 text-ember-800/60">
      <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  if (isPhaseStubError(error)) {
    return (
      <div className="rounded-xl border border-ember-100 bg-ember-50/60 p-6 text-sm text-ember-900/70">
        This section comes online with the feature phases that follow Phase 1 scaffolding.
      </div>
    );
  }
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-ember-100 bg-ember-50/60 p-10 text-center">
      <p className="font-medium text-ember-800">{title}</p>
      {children && <div className="mt-2 text-sm text-ember-900/60">{children}</div>}
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
    neutral: 'bg-ember-100 text-ember-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-flame-600 text-white',
    gold: 'bg-gold-100 text-gold-800',
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
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px w-6 bg-gold-500" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-gold-600">{overline}</p>
          </div>
        )}
        <h2 className="font-display text-xl font-bold text-ember-800 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ember-900/60">{subtitle}</p>}
      </Reveal>
      {to && (
        <Link
          to={to}
          className="group/see shrink-0 rounded-full border border-indigo-200 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-indigo-700 shadow-card transition duration-300 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-none"
        >
          <span className="inline-flex items-center gap-1">
            View all
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/see:translate-x-0.5" />
          </span>
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
  images?: Array<{ id: string; url: string; altText: string | null; displayOrder: number }>;
  category?: { slug: string; name: string } | { id: string; slug: string; name: string } | null;
  inStock?: boolean | null;
};

function imageOf(product: CardProduct): string | null {
  if (product.image) return product.image;
  if (product.images && product.images.length > 0) return product.images[0].url;
  return null;
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
        className="flex flex-col overflow-hidden rounded-xl border border-line bg-paper-strong shadow-card transition duration-300 hover:-translate-y-1 hover:border-flame-200 hover:shadow-lifted"
      >
        <div className="relative aspect-square overflow-hidden bg-ember-50">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center" aria-hidden>
              <TicketStar className="h-12 w-12 text-ember-600/40" />
            </div>
          )}
          {discount !== null && (
            <span className="absolute left-2 top-2 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 px-2 py-0.5 text-xs font-bold text-ink shadow-sm">
              {discount}% off
            </span>
          )}
          {product.inStock === false && (
            <span className="absolute bottom-2 left-2 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
              Out of stock
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ember-900/50">{product.category?.name ?? formatUnit(product.unit)}</p>
            {product.inStock ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" aria-hidden />
                In stock
              </span>
            ) : null}
          </div>
          <h3 className="mt-0.5 line-clamp-2 font-display text-sm font-semibold text-ember-900 group-hover:text-flame-600">
            {product.name}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display font-bold text-flame-600">{formatMoney(product.basePrice)}</span>
            {product.mrpPrice && (
              <span className="text-xs text-ember-900/40 line-through">{formatMoney(product.mrpPrice)}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Floating quick actions — siblings of the card link, so no nested interactive elements. */}
      <button
        type="button"
        onClick={onWishlist}
        aria-label={wished ? 'Added to wishlist' : 'Add to wishlist'}
        className={cn(
          'absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-card transition duration-200 hover:scale-110 active:scale-95',
          wished ? 'bg-flame-600 text-white' : 'bg-white/90 text-ember-700 backdrop-blur hover:text-flame-600',
        )}
      >
        <Heart className="h-4 w-4" filled={wished} />
      </button>
      <button
        type="button"
        onClick={onQuickAdd}
        disabled={addToCart.isPending}
        aria-label={`Add ${product.name} to cart`}
        className="absolute bottom-[92px] right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-flame-600 text-white opacity-0 shadow-cta transition duration-200 hover:bg-flame-700 hover:scale-110 active:scale-95 group-hover:opacity-100 disabled:opacity-60"
      >
        {addToCart.isPending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <Plus className="h-4 w-4" stroke="bold" />
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
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Spinner label="Checking your session…" />
      </section>
    );
  }
  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16">
        <EmptyState title={title}>
          <p className="mt-3">
            <Link to="/profile" className="font-medium text-indigo-600 underline">
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