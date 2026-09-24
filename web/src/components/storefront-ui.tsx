import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isPhaseStubError } from '../pages/phase-state';
import { discountPercent, formatMoney, formatUnit } from '../lib/format';

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-orange-800/60">
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
      <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-6 text-sm text-orange-900/70">
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
    <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-10 text-center">
      <p className="font-medium text-orange-800">{title}</p>
      {children && <div className="mt-2 text-sm text-orange-900/60">{children}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'orange';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-orange-100 text-orange-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-600 text-white',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function SectionHeading({ title, subtitle, to }: { title: string; subtitle?: string; to?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-orange-800 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-orange-900/60">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="shrink-0 text-sm font-medium text-orange-700 hover:underline">
          View all →
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product card                                                        */
/* ------------------------------------------------------------------ */

export type CardProduct = {
  slug: string;
  name: string;
  basePrice: string;
  mrpPrice: string | null;
  unit: string;
  shortDescription?: string | null;
  image?: string | null;
  category?: { slug: string; name: string } | { id: string; slug: string; name: string } | null;
};

function imageOf(product: CardProduct): string | null {
  if (product.image) return product.image;
  return null;
}

export function ProductCard({ product }: { product: CardProduct }) {
  const image = imageOf(product);
  const discount = discountPercent(product.basePrice, product.mrpPrice);
  const categoryHref = product.category?.slug
    ? `/products/${product.category.slug}/${product.slug}`
    : `/products/slug/${product.slug}`;

  return (
    <Link
      to={categoryHref}
      className="group flex flex-col overflow-hidden rounded-xl border border-orange-100 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square bg-orange-50">
        {image ? (
          <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl" aria-hidden>
            🎆
          </div>
        )}
        {discount !== null && (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            {discount}% off
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-xs text-orange-900/50">{product.category?.name ?? formatUnit(product.unit)}</p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-orange-900 group-hover:text-orange-700">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-bold text-orange-800">{formatMoney(product.basePrice)}</span>
          {product.mrpPrice && (
            <span className="text-xs text-orange-900/40 line-through">{formatMoney(product.mrpPrice)}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-orange-900/50">per {formatUnit(product.unit).toLowerCase()}</p>
      </div>
    </Link>
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
            <Link to="/profile" className="font-medium text-orange-700 underline">
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