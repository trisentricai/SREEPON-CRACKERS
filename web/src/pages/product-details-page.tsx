import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paper, Plus, Send, ShieldDone, TicketStar } from 'react-iconly';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart, Product } from '@/api/types';
import { Badge, ErrorState, Reveal, Skeleton } from '@/components/storefront-ui';
import { SITE } from '@/config/env';
import { useAuth } from '@/features/auth/context/auth-context';
import { discountPercent, formatMoney, formatUnit } from '@/lib/format';
import { imagePositionCss } from '@/lib/image-position';
import { useJsonLd, usePageMeta } from '@/lib/seo';

/**
 * Iconly ships no minus/remove glyph, so the quantity stepper draws a single
 * 24px-grid dash that inherits `currentColor` like the Iconly icons around it.
 */
function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Product detail with gallery, add-to-cart, and wishlist actions. */
export function ProductDetailsPage() {
  const params = useParams();
  const productSlug = params.productSlug!;
  const { isAuthenticated } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const productQuery = useQuery({
    queryKey: ['product-by-slug', productSlug],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Product>>(`/products/slug/${productSlug}`);
      return data.data;
    },
  });

  const addToCart = useMutation({
    mutationFn: async () => {
      if (!productQuery.data) throw new Error('Product not loaded');
      const unit =
        productQuery.data.unit === 'BOX' ||
        productQuery.data.unit === 'PACKET' ||
        productQuery.data.unit === 'SINGLE'
          ? productQuery.data.unit
          : 'BOX';
      const { data } = await api.post<ApiEnvelope<Cart>>('/cart/items', {
        productId: productQuery.data.id,
        quantity,
        unit,
      });
      return data.data;
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not add to cart'),
  });

  const addToWishlist = useMutation({
    mutationFn: async () => {
      if (!productQuery.data) throw new Error('Product not loaded');
      const { data } = await api.post<ApiEnvelope<{ item: unknown; created: boolean }>>(
        '/wishlist/items',
        {
          productId: productQuery.data.id,
        },
      );
      return data.data;
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not add to wishlist'),
  });

  // Route-level head tags and schema. Called before the early returns so the
  // hook order stays stable across loading/error/success renders.
  const productData = productQuery.data;
  const productInStock = (productData?.inventory?.quantity ?? 0) > 0;

  usePageMeta({
    title: productData?.name,
    description: productData?.shortDescription ?? productData?.description?.slice(0, 160),
    path: productData ? `/products/slug/${productData.slug}` : undefined,
    image: productData?.images[0]?.url ?? null,
    type: 'product',
    noindex: productQuery.isError,
  });

  useJsonLd(
    'ld-product',
    productData
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: productData.name,
          description: productData.description ?? productData.shortDescription ?? undefined,
          sku: productData.sku,
          image: productData.images.map((image) => image.url),
          brand: { '@type': 'Brand', name: SITE.name },
          ...(productData.category ? { category: productData.category.name } : {}),
          ...(productData.minimumAge
            ? { audience: { '@type': 'PeopleAudience', suggestedMinAge: productData.minimumAge } }
            : {}),
          offers: {
            '@type': 'Offer',
            price: productData.basePrice,
            priceCurrency: 'INR',
            availability: productInStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: `${SITE.baseUrl}/products/slug/${productData.slug}`,
            seller: { '@type': 'Organization', name: SITE.name },
          },
        }
      : null,
  );

  if (productQuery.isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="h-4 w-64 rounded-lg" />
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <Skeleton className="aspect-square rounded-xl" />
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-20 w-20 rounded-lg" />
              <Skeleton className="h-20 w-20 rounded-lg" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-9 w-3/4 rounded-xl" />
            <Skeleton className="h-5 w-2/3 rounded-lg" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-11 w-52 rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <ErrorState error={productQuery.error} />
      </section>
    );
  }

  const product = productQuery.data;
  const images = product.images.length > 0 ? product.images : null;
  const discount = discountPercent(product.basePrice, product.mrpPrice);
  const inStock = productInStock;

  return (
    <section className="mx-auto max-w-6xl px-4 py-5">
      <nav className="text-xs text-ink-muted">
        <Link to="/products" className="hover:text-accent">
          Catalogue
        </Link>
        {product.category && (
          <>
            {' / '}
            <Link to={`/products/${product.category.slug}`} className="hover:text-accent">
              {product.category.name}
            </Link>
          </>
        )}
        {' / '}
        <span className="text-ink-muted">{product.name}</span>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {/* Gallery */}
        <Reveal>
          <div className="aspect-square overflow-hidden rounded-lg border border-line bg-surface-warm shadow-card">
            {images ? (
              <img
                src={images[activeImage]?.url}
                alt={images[activeImage]?.altText ?? product.name}
                className="h-full w-full object-cover"
                style={{ objectPosition: imagePositionCss(images[activeImage]?.objectPosition) }}
              />
            ) : (
              <div className="flex h-full items-center justify-center" aria-hidden>
                <TicketStar className="h-16 w-16 text-ember-300" />
              </div>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="mt-2 flex gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setActiveImage(index)}
                  className={`h-14 w-14 overflow-hidden rounded border-2 transition ${index === activeImage ? 'border-accent shadow-sm' : 'border-transparent hover:border-line'}`}
                >
                  <img
                    src={image.url}
                    alt={image.altText ?? ''}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: imagePositionCss(image.objectPosition) }}
                  />
                </button>
              ))}
            </div>
          )}
        </Reveal>

        {/* Details */}
        <Reveal delay={80}>
          <div className="flex items-center gap-2">
            {product.isFeatured && <Badge tone="orange">Featured</Badge>}
            <Badge tone={inStock ? 'green' : 'red'}>{inStock ? 'In stock' : 'Out of stock'}</Badge>
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink">{product.name}</h1>
          {product.shortDescription && (
            <p className="mt-1 text-sm text-ink-muted">{product.shortDescription}</p>
          )}

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{formatMoney(product.basePrice)}</span>
            {product.mrpPrice && (
              <span className="text-sm text-ink-muted/70 line-through">
                {formatMoney(product.mrpPrice)}
              </span>
            )}
            {discount !== null && <Badge tone="red">{discount}% off</Badge>}
          </div>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
            <Send className="h-3.5 w-3.5" /> Delivered in 10–15 min · per{' '}
            {formatUnit(product.unit).toLowerCase()}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-line bg-white p-4 text-sm shadow-card">
            <div className="relative">
              <dt className="text-ink-muted">SKU</dt>
              <dd className="font-medium text-ink">{product.sku}</dd>
              <span
                className="absolute -left-2 top-0 h-full w-0.5 rounded-full bg-accent-soft"
                aria-hidden
              />
            </div>
            <div>
              <dt className="text-ink-muted">Unit</dt>
              <dd className="font-medium text-ink">{formatUnit(product.unit)}</dd>
            </div>
            {product.piecesPerBox !== null && (
              <div>
                <dt className="text-ink-muted">Pieces per box</dt>
                <dd className="font-medium text-ink">{product.piecesPerBox}</dd>
              </div>
            )}
            {product.minimumAge !== null && (
              <div>
                <dt className="text-ink-muted">Minimum age</dt>
                <dd className="font-medium text-ink">{product.minimumAge}+</dd>
              </div>
            )}
            {product.weightPerBox && (
              <div>
                <dt className="text-ink-muted">Weight per box</dt>
                <dd className="font-medium text-ink">{product.weightPerBox} kg</dd>
              </div>
            )}
          </dl>

          {product.description && (
            <div className="mt-4">
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-ink">
                <span className="h-4 w-1 rounded-full bg-accent" aria-hidden />
                Description
              </h2>
              <p className="whitespace-pre-line text-sm text-ink-muted">{product.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-muted">Qty</span>
              <div className="flex items-center rounded border border-line bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={!isAuthenticated || !inStock || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="quick-press flex h-8 w-8 items-center justify-center rounded-l text-ink hover:bg-accent-soft active:scale-95 disabled:opacity-40"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span
                  className="w-8 text-center text-xs font-bold tabular-nums text-ink"
                  aria-live="polite"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={!isAuthenticated || !inStock || quantity >= 10}
                  aria-label="Increase quantity"
                  className="quick-press flex h-8 w-8 items-center justify-center rounded-r text-ink hover:bg-accent-soft active:scale-95 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              onClick={() => addToCart.mutate()}
              disabled={!isAuthenticated || !inStock || addToCart.isPending}
              className="quick-press inline-flex h-9 items-center rounded border border-accent bg-accent px-5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-accent/90 disabled:opacity-50"
            >
              {addToCart.isPending ? 'Adding…' : 'Add to cart'}
            </button>
            <button
              onClick={() => addToWishlist.mutate()}
              disabled={!isAuthenticated || addToWishlist.isPending}
              className="quick-press inline-flex h-9 items-center rounded border border-line px-4 text-sm font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50"
            >
              {addToWishlist.isPending ? 'Saving…' : 'Add to wishlist'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-line bg-surface-warm p-3 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Send className="h-4 w-4 text-accent" /> Delivered in 10–15 min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldDone className="h-4 w-4 text-accent" /> Fresh stock guaranteed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Paper className="h-4 w-4 text-accent" /> GST invoice on every order
            </span>
          </div>

          {!isAuthenticated && (
            <p className="mt-4 text-sm text-ink-muted">
              <Link to="/profile" className="font-medium text-accent underline">
                Sign in
              </Link>{' '}
              to add items to your cart or wishlist.
            </p>
          )}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </Reveal>
      </div>
    </section>
  );
}
