import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Plus, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart } from '@/api/types';
import { useAuth } from '@/features/auth/context/auth-context';
import { discountPercent, formatMoney, formatUnit } from '../lib/format';
import { cn, type CardProduct } from './storefront-ui';

/* ------------------------------------------------------------------ */
/* Sticker-book primitives — the playful family-friendly design system. */
/* Chunky borders (2px ink), hard offset shadows, candy fills, Baloo 2. */
/* ------------------------------------------------------------------ */

type ChunkyTone = 'sunny' | 'coral' | 'white' | 'grape' | 'ink';

const CHUNKY_TONES: Record<ChunkyTone, string> = {
  sunny: 'bg-sunny-400 text-ink',
  coral: 'bg-coral-600 text-white',
  white: 'bg-white text-ink',
  grape: 'bg-grape-600 text-white',
  ink: 'bg-ink text-sunny-400',
};

/** Chunky pill button (or link) with ink border + hard shadow + squish press. */
export function ChunkyButton({
  to,
  onClick,
  type = 'button',
  tone = 'sunny',
  disabled = false,
  className = '',
  children,
}: {
  to?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  tone?: ChunkyTone;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink px-6 py-3',
    'font-display text-base font-bold shadow-sticker transition duration-150',
    'hover:-translate-y-0.5 hover:shadow-sticker-lg',
    'active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
    'disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-sticker',
    CHUNKY_TONES[tone],
    className,
  );
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

/** Sticker card shell — white, ink border, hard shadow, bubble radius. */
export function StickerCard({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-bubble border-2 border-ink bg-white shadow-sticker', className)}>{children}</div>;
}

/** 12-point starburst badge for discounts and callouts. */
export function Starburst({ label, sub, className = '' }: { label: string; sub?: string; className?: string }) {
  return (
    <div className={cn('relative flex h-24 w-24 -rotate-12 items-center justify-center', className)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <polygon
          points="50.0,2.0 59.6,14.3 74.0,8.4 76.2,23.8 91.6,26.0 85.7,40.4 98.0,50.0 85.7,59.6 91.6,74.0 76.2,76.2 74.0,91.6 59.6,85.7 50.0,98.0 40.4,85.7 26.0,91.6 23.8,76.2 8.4,74.0 14.3,59.6 2.0,50.0 14.3,40.4 8.4,26.0 23.8,23.8 26.0,8.4 40.4,14.3"
          fill="var(--color-sunny-400)"
          stroke="var(--color-ink)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      <span className="relative text-center font-display leading-tight text-ink">
        <span className="block text-lg font-extrabold">{label}</span>
        {sub && <span className="block text-[11px] font-bold">{sub}</span>}
      </span>
    </div>
  );
}

/** Wavy section divider (fill any candy tint). */
export function WaveDivider({ fill = 'var(--color-sunny-100)', flip = false, className = '' }: { fill?: string; flip?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={cn('block h-10 w-full sm:h-14', flip && 'rotate-180', className)}
      aria-hidden
    >
      <path
        d="M0,64 C240,120 480,0 720,64 C960,128 1200,16 1440,64 L1440,120 L0,120 Z"
        fill={fill}
      />
    </svg>
  );
}

/** Poppy the rocket — inline-SVG mascot for heroes and empty states. */
export function Mascot({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} role="img" aria-label="Poppy the rocket mascot">
      {/* flame */}
      <path
        d="M60 132 C48 116 52 102 60 94 C68 102 72 116 60 132 Z"
        fill="var(--color-sunny-400)"
        stroke="var(--color-ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M60 124 C55 115 56 107 60 103 C64 107 65 115 60 124 Z" fill="var(--color-coral-500)" />
      {/* fins */}
      <path
        d="M38 82 L22 106 L40 100 Z"
        fill="var(--color-sunny-400)"
        stroke="var(--color-ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M82 82 L98 106 L80 100 Z"
        fill="var(--color-sunny-400)"
        stroke="var(--color-ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* body */}
      <path
        d="M60 6 C78 6 87 30 87 56 L87 84 C87 92 79 96 60 96 C41 96 33 92 33 84 L33 56 C33 30 42 6 60 6 Z"
        fill="var(--color-coral-500)"
        stroke="var(--color-ink)"
        strokeWidth="3"
      />
      {/* window */}
      <circle cx="60" cy="52" r="13" fill="var(--color-bubble-100)" stroke="var(--color-ink)" strokeWidth="3" />
      <circle cx="56" cy="48" r="4" fill="var(--color-bubble-400)" />
      {/* sparkles */}
      <path d="M18 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="var(--color-sunny-400)" stroke="var(--color-ink)" strokeWidth="1.5" />
      <path d="M102 40 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z" fill="var(--color-grape-400)" stroke="var(--color-ink)" strokeWidth="1.5" />
    </svg>
  );
}

type ChipTone = 'sunny' | 'bubble' | 'grape' | 'mint' | 'candy' | 'white';

const CHIP_TONES: Record<ChipTone, string> = {
  sunny: 'bg-sunny-100',
  bubble: 'bg-bubble-100',
  grape: 'bg-grape-100',
  mint: 'bg-mint-100',
  candy: 'bg-candy-100',
  white: 'bg-white',
};

/** Pastel sticker chip with ink border (trust chips, category bubbles). */
export function FunChip({
  icon: Icon,
  label,
  tone = 'sunny',
  className = '',
}: {
  icon: LucideIcon;
  label: string;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-sm font-bold text-ink shadow-sticker-sm',
        CHIP_TONES[tone],
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

/** Playful section heading — rotated sticker overline + Baloo 2 title. */
export function FunHeading({
  title,
  subtitle,
  overline,
  to,
  actionLabel = 'See all',
}: {
  title: string;
  subtitle?: string;
  overline?: string;
  to?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {overline && (
          <span className="mb-2 inline-block -rotate-1 rounded-lg border-2 border-ink bg-sunny-400 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-widest text-ink shadow-sticker-sm">
            {overline}
          </span>
        )}
        <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 font-medium text-ink-muted">{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="shrink-0 rounded-full border-2 border-ink bg-white px-4 py-1.5 font-display text-sm font-bold text-ink shadow-sticker-sm transition duration-150 hover:-translate-y-0.5 hover:bg-sunny-100 active:translate-y-0 active:shadow-none"
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}

/** Sticker brand mark — sunny rocket tile + Baloo wordmark. */
export function StickerBrand({ name, to = '/', light = false }: { name: string; to?: string; light?: boolean }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label={name}>
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-ink bg-sunny-400 shadow-sticker-sm transition duration-150 group-hover:rotate-6 group-hover:scale-105">
        <Rocket className="h-5 w-5 text-ink" strokeWidth={2.5} />
      </span>
      <span className={cn('font-display text-2xl font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')}>
        {name}
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Sticker product card — same cart/wishlist behaviour as ProductCard,  */
/* brand-new sticker skin. Title/image link; price + Add row in flow.  */
/* ------------------------------------------------------------------ */

function imageOf(product: CardProduct): string | null {
  if (product.image) return product.image;
  if (product.images && product.images.length > 0) return product.images[0].url;
  return null;
}

function cartUnitOf(unit: string): string {
  return unit === 'BOX' || unit === 'PACKET' || unit === 'SINGLE' ? unit : 'BOX';
}

function useCardActions(product: CardProduct) {
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

  return {
    wished,
    adding: addToCart.isPending,
    onWishlist: () => {
      if (!isAuthenticated) return requestAuth();
      void addToWishlist.mutate();
    },
    onQuickAdd: () => {
      if (!isAuthenticated) return requestAuth();
      void addToCart.mutate();
    },
  };
}

export function StickerProductCard({ product }: { product: CardProduct }) {
  const image = imageOf(product);
  const discount = discountPercent(product.basePrice, product.mrpPrice);
  const categoryHref = product.category?.slug
    ? `/products/${product.category.slug}/${product.slug}`
    : `/products/slug/${product.slug}`;
  const { wished, adding, onWishlist, onQuickAdd } = useCardActions(product);

  return (
    <div className="group relative flex flex-col rounded-bubble border-2 border-ink bg-white shadow-sticker transition duration-150 hover:-translate-y-1 hover:rotate-[-0.5deg] hover:shadow-sticker-lg">
      <Link to={categoryHref} className="block" aria-label={product.name}>
        <div className="relative m-2 overflow-hidden rounded-2xl border-2 border-ink bg-sunny-100">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center" aria-hidden>
              <span className="font-display text-4xl font-extrabold text-ink/20">
                {(product.name ?? '?').slice(0, 1)}
              </span>
            </div>
          )}
          {discount !== null && (
            <Starburst label={`${discount}%`} sub="off" className="absolute -right-2 -top-2 h-16 w-16 scale-90" />
          )}
          {product.inStock === false && (
            <span className="absolute bottom-2 left-2 rounded-full border-2 border-ink bg-ink/80 px-2 py-0.5 text-[11px] font-bold text-white">
              Sold out
            </span>
          )}
        </div>
        <div className="px-4 pt-2">
          <span className="inline-block rounded-full border-2 border-ink bg-bubble-100 px-2 py-0.5 text-[11px] font-bold text-ink">
            {product.category?.name ?? formatUnit(product.unit)}
          </span>
          <h3 className="mt-1.5 line-clamp-2 font-display text-base font-bold leading-snug text-ink">
            {product.name}
          </h3>
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-2 p-4 pt-2">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-display text-lg font-extrabold text-coral-600">
            {formatMoney(product.basePrice)}
          </span>
          {product.mrpPrice && (
            <span className="shrink-0 text-xs font-semibold text-ink-muted line-through">
              {formatMoney(product.mrpPrice)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onQuickAdd}
          disabled={adding}
          aria-label={`Add ${product.name} to cart`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-ink bg-sunny-400 px-3.5 py-1.5 font-display text-sm font-bold text-ink shadow-sticker-sm transition duration-150 hover:-translate-y-0.5 hover:bg-sunny-500 active:translate-y-0 active:shadow-none disabled:opacity-60"
        >
          {adding ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={3.5} />
          )}
          Add
        </button>
      </div>

      <button
        type="button"
        onClick={onWishlist}
        aria-label={wished ? 'Added to wishlist' : 'Add to wishlist'}
        className={cn(
          'absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink shadow-sticker-sm transition duration-150 hover:scale-110 active:scale-95',
          wished ? 'bg-coral-500 text-white' : 'bg-white text-ink hover:text-coral-600',
        )}
      >
        <Heart className={cn('h-4 w-4', wished && 'fill-current')} />
      </button>
    </div>
  );
}
