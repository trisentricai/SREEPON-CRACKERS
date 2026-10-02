import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Minus, PartyPopper, Plus, ShieldCheck, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart, Product } from '@/api/types';
import { Badge, ErrorState, Reveal, Skeleton } from '@/components/storefront-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { discountPercent, formatMoney, formatUnit } from '@/lib/format';

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
      const unit = productQuery.data.unit === 'BOX' || productQuery.data.unit === 'PACKET' || productQuery.data.unit === 'SINGLE'
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
      const { data } = await api.post<ApiEnvelope<{ item: unknown; created: boolean }>>('/wishlist/items', {
        productId: productQuery.data.id,
      });
      return data.data;
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not add to wishlist'),
  });

  if (productQuery.isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Skeleton className="h-4 w-64 rounded-lg" />
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
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
      <section className="mx-auto max-w-7xl px-4 py-12">
        <ErrorState error={productQuery.error} />
      </section>
    );
  }

  const product = productQuery.data;
  const images = product.images.length > 0 ? product.images : null;
  const discount = discountPercent(product.basePrice, product.mrpPrice);
  const inStock = (product.inventory?.quantity ?? 0) > 0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-sm text-ember-900/50">
        <Link to="/products" className="hover:text-flame-700">Catalogue</Link>
        {product.category && (
          <>
            {' / '}
            <Link to={`/products/${product.category.slug}`} className="hover:text-flame-700">
              {product.category.name}
            </Link>
          </>
        )}
        {' / '}
        <span className="text-ember-900/70">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <Reveal>
          <div className="aspect-square overflow-hidden rounded-xl border border-line bg-ember-50 shadow-card">
            {images ? (
              <img
                src={images[activeImage]?.url}
                alt={images[activeImage]?.altText ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center" aria-hidden>
                <PartyPopper className="h-16 w-16 text-ember-300" />
              </div>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setActiveImage(index)}
                  className={`h-20 w-20 overflow-hidden rounded-lg border-2 transition ${index === activeImage ? 'border-flame-600 shadow-sm' : 'border-transparent hover:border-flame-200'}`}
                >
                  <img src={image.url} alt={image.altText ?? ''} className="h-full w-full object-cover" />
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
          <h1 className="mt-3 font-display text-3xl font-bold text-ember-900">{product.name}</h1>
          {product.shortDescription && <p className="mt-2 text-ember-900/70">{product.shortDescription}</p>}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-flame-600">{formatMoney(product.basePrice)}</span>
            {product.mrpPrice && (
              <span className="text-lg text-ember-900/40 line-through">{formatMoney(product.mrpPrice)}</span>
            )}
            {discount !== null && <Badge tone="red">{discount}% off</Badge>}
          </div>
          <p className="mt-1 text-sm text-ember-900/50">per {formatUnit(product.unit).toLowerCase()}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-line bg-paper-strong p-5 text-sm shadow-card">
            <div className="relative">
              <dt className="text-ember-900/50">SKU</dt>
              <dd className="font-medium text-ember-900">{product.sku}</dd>
              <span className="absolute -left-2 top-0 h-full w-0.5 rounded-full bg-flame-200" aria-hidden />
            </div>
            <div>
              <dt className="text-ember-900/50">Unit</dt>
              <dd className="font-medium text-ember-900">{formatUnit(product.unit)}</dd>
            </div>
            {product.piecesPerBox !== null && (
              <div>
                <dt className="text-ember-900/50">Pieces per box</dt>
                <dd className="font-medium text-ember-900">{product.piecesPerBox}</dd>
              </div>
            )}
            {product.minimumAge !== null && (
              <div>
                <dt className="text-ember-900/50">Minimum age</dt>
                <dd className="font-medium text-ember-900">{product.minimumAge}+</dd>
              </div>
            )}
            {product.weightPerBox && (
              <div>
                <dt className="text-ember-900/50">Weight per box</dt>
                <dd className="font-medium text-ember-900">{product.weightPerBox} kg</dd>
              </div>
            )}
          </dl>

          {product.description && (
            <div className="mt-6">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-ember-900">
                <span className="h-4 w-1 rounded-full bg-flame-500" aria-hidden />
                Description
              </h2>
              <p className="whitespace-pre-line text-sm text-ember-900/70">{product.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-ember-900/70">Qty</span>
              <div className="flex items-center rounded-full border border-ember-200 bg-paper-strong shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={!isAuthenticated || !inStock || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-9 w-9 items-center justify-center rounded-l-full text-ember-800 transition hover:bg-flame-50 active:scale-95 disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-9 text-center text-sm font-bold tabular-nums text-ember-900" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={!isAuthenticated || !inStock || quantity >= 10}
                  aria-label="Increase quantity"
                  className="flex h-9 w-9 items-center justify-center rounded-r-full text-ember-800 transition hover:bg-flame-50 active:scale-95 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              onClick={() => addToCart.mutate()}
              disabled={!isAuthenticated || !inStock || addToCart.isPending}
              className="rounded-full bg-flame-600 px-7 py-2.5 font-semibold text-white shadow-cta transition duration-200 hover:-translate-y-0.5 hover:bg-flame-700 active:scale-95 disabled:translate-y-0 disabled:opacity-50"
            >
              {addToCart.isPending ? 'Adding…' : 'Add to cart'}
            </button>
            <button
              onClick={() => addToWishlist.mutate()}
              disabled={!isAuthenticated || addToWishlist.isPending}
              className="rounded-full border border-flame-300 px-6 py-2.5 font-semibold text-flame-600 transition duration-200 hover:bg-flame-50 active:scale-95 disabled:opacity-50"
            >
              {addToWishlist.isPending ? 'Saving…' : 'Add to wishlist'}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line bg-paper-strong p-4 text-sm text-ember-900/70 shadow-card">
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-indigo-600" /> Ships in 24–48h
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600" /> Licensed &amp; insured
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-indigo-600" /> GST invoice included
            </span>
          </div>

          {!isAuthenticated && (
            <p className="mt-4 text-sm text-ember-900/60">
              <Link to="/profile" className="font-medium text-flame-600 underline">
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