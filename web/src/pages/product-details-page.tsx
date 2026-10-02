import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart, Product } from '@/api/types';
import { ErrorState, Reveal, Skeleton } from '@/components/storefront-ui';
import { ChunkyButton, FunChip, Mascot, Starburst, StickerCard } from '@/components/sticker-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { discountPercent, formatMoney, formatUnit } from '@/lib/format';

const SPEC_TONES = ['bg-sunny-100', 'bg-bubble-100', 'bg-grape-100', 'bg-mint-100', 'bg-candy-100'];

/** Product detail with sticker gallery, stepper, and chunky actions. */
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
        <Skeleton className="h-6 w-64 rounded-full border-2 border-ink" />
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <Skeleton className="aspect-square rounded-bubble border-2 border-ink" />
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-20 w-20 rounded-2xl border-2 border-ink" />
              <Skeleton className="h-20 w-20 rounded-2xl border-2 border-ink" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-7 w-44 rounded-full border-2 border-ink" />
            <Skeleton className="h-10 w-3/4 rounded-2xl border-2 border-ink" />
            <Skeleton className="h-5 w-2/3 rounded-full border-2 border-ink" />
            <Skeleton className="h-28 w-full rounded-bubble border-2 border-ink" />
            <Skeleton className="h-12 w-56 rounded-full border-2 border-ink" />
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

  const specs: Array<{ label: string; value: string }> = [
    { label: 'SKU', value: product.sku },
    { label: 'Unit', value: formatUnit(product.unit) },
    ...(product.piecesPerBox !== null ? [{ label: 'Pieces per box', value: String(product.piecesPerBox) }] : []),
    ...(product.minimumAge !== null ? [{ label: 'Minimum age', value: `${product.minimumAge}+` }] : []),
    ...(product.weightPerBox ? [{ label: 'Weight per box', value: `${product.weightPerBox} kg` }] : []),
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <Link
          to="/products"
          className="rounded-full border-2 border-ink bg-white px-3 py-0.5 text-ink shadow-sticker-sm transition hover:bg-sunny-100"
        >
          Catalogue
        </Link>
        {product.category && (
          <Link
            to={`/products/${product.category.slug}`}
            className="rounded-full border-2 border-ink bg-white px-3 py-0.5 text-ink shadow-sticker-sm transition hover:bg-sunny-100"
          >
            {product.category.name}
          </Link>
        )}
        <span className="max-w-full truncate rounded-full border-2 border-ink bg-sunny-100 px-3 py-0.5 text-ink">
          {product.name}
        </span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <Reveal>
          <StickerCard className="p-2">
            <div className="overflow-hidden rounded-3xl border-2 border-ink bg-sunny-100">
              {images ? (
                <img
                  src={images[activeImage]?.url}
                  alt={images[activeImage]?.altText ?? product.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center" aria-hidden>
                  <Mascot className="h-32 w-auto opacity-80" />
                </div>
              )}
            </div>
          </StickerCard>
          {images && images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                  className={`h-20 w-20 overflow-hidden rounded-2xl border-2 transition duration-150 ${
                    index === activeImage
                      ? 'border-ink shadow-sticker-sm'
                      : 'border-ink/20 hover:border-ink'
                  }`}
                >
                  <img src={image.url} alt={image.altText ?? ''} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Reveal>

        {/* Details */}
        <Reveal delay={80}>
          <div className="flex flex-wrap items-center gap-2">
            {product.isFeatured && <FunChip icon={Sparkles} label="Featured" tone="sunny" />}
            <FunChip
              icon={BadgeCheck}
              label={inStock ? 'In stock' : 'Sold out'}
              tone={inStock ? 'mint' : 'candy'}
            />
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">{product.name}</h1>
          {product.shortDescription && <p className="mt-2 font-medium text-ink-muted">{product.shortDescription}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="font-display text-4xl font-extrabold text-coral-600">{formatMoney(product.basePrice)}</span>
            {product.mrpPrice && (
              <span className="text-lg font-semibold text-ink-muted line-through">{formatMoney(product.mrpPrice)}</span>
            )}
            {discount !== null && <Starburst label={`${discount}%`} sub="off" className="h-16 w-16" />}
          </div>
          <p className="mt-1 text-sm font-bold text-ink-muted">per {formatUnit(product.unit).toLowerCase()}</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {specs.map((spec, index) => (
              <div
                key={spec.label}
                className={`rounded-2xl border-2 border-ink p-3 shadow-sticker-sm ${SPEC_TONES[index % SPEC_TONES.length]}`}
              >
                <dt className="text-xs font-bold uppercase tracking-wider text-ink/60">{spec.label}</dt>
                <dd className="font-display text-base font-bold text-ink">{spec.value}</dd>
              </div>
            ))}
          </div>

          {product.description && (
            <div className="mt-6">
              <span className="inline-block -rotate-1 rounded-lg border-2 border-ink bg-bubble-100 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-widest text-ink shadow-sticker-sm">
                The fun details
              </span>
              <p className="mt-2 whitespace-pre-line text-sm font-medium text-ink-muted">{product.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-bold text-ink">Qty</span>
              <div className="flex items-center rounded-full border-2 border-ink bg-white shadow-sticker-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={!isAuthenticated || !inStock || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-10 w-10 items-center justify-center rounded-l-full text-ink transition hover:bg-sunny-100 active:scale-95 disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" strokeWidth={3} />
                </button>
                <span className="w-9 text-center font-display text-base font-extrabold tabular-nums text-ink" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={!isAuthenticated || !inStock || quantity >= 10}
                  aria-label="Increase quantity"
                  className="flex h-10 w-10 items-center justify-center rounded-r-full text-ink transition hover:bg-sunny-100 active:scale-95 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
            </div>
            <ChunkyButton
              onClick={() => addToCart.mutate()}
              tone="coral"
              disabled={!isAuthenticated || !inStock || addToCart.isPending}
              className="px-7"
            >
              <ShoppingBag className="h-5 w-5" />
              {addToCart.isPending ? 'Adding…' : 'Add to cart'}
            </ChunkyButton>
            <ChunkyButton
              onClick={() => addToWishlist.mutate()}
              tone="white"
              disabled={!isAuthenticated || addToWishlist.isPending}
              className="px-6"
            >
              {addToWishlist.isPending ? 'Saving…' : 'Wishlist it'}
            </ChunkyButton>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <FunChip icon={Truck} label="Ships in 24–48h" tone="mint" />
            <FunChip icon={ShieldCheck} label="Licensed & insured" tone="bubble" />
            <FunChip icon={BadgeCheck} label="GST invoice included" tone="grape" />
          </div>

          {!isAuthenticated && (
            <p className="mt-4 text-sm font-medium text-ink-muted">
              <Link to="/profile" className="font-bold text-coral-600 underline">
                Sign in
              </Link>{' '}
              to add items to your cart or wishlist.
            </p>
          )}
          {error && <p className="mt-4 text-sm font-bold text-red-600">{error}</p>}
        </Reveal>
      </div>
    </section>
  );
}
