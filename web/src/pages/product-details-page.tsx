import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PartyPopper } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart, Product } from '@/api/types';
import { Badge, ErrorState, Spinner } from '@/components/storefront-ui';
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
        <Spinner label="Loading product…" />
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
        <Link to="/products" className="hover:text-ember-700">Catalogue</Link>
        {product.category && (
          <>
            {' / '}
            <Link to={`/products/${product.category.slug}`} className="hover:text-ember-700">
              {product.category.name}
            </Link>
          </>
        )}
        {' / '}
        <span className="text-ember-900/70">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-ember-100 bg-ember-50">
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
                  className={`h-20 w-20 overflow-hidden rounded-lg border-2 ${index === activeImage ? 'border-ember-600' : 'border-transparent'}`}
                >
                  <img src={image.url} alt={image.altText ?? ''} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center gap-2">
            {product.isFeatured && <Badge tone="orange">Featured</Badge>}
            <Badge tone={inStock ? 'green' : 'red'}>{inStock ? 'In stock' : 'Out of stock'}</Badge>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold text-ember-900">{product.name}</h1>
          {product.shortDescription && <p className="mt-2 text-ember-900/70">{product.shortDescription}</p>}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-ember-700">{formatMoney(product.basePrice)}</span>
            {product.mrpPrice && (
              <span className="text-lg text-ember-900/40 line-through">{formatMoney(product.mrpPrice)}</span>
            )}
            {discount !== null && <Badge tone="red">{discount}% off</Badge>}
          </div>
          <p className="mt-1 text-sm text-ember-900/50">per {formatUnit(product.unit).toLowerCase()}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-ember-100 bg-ember-50/50 p-5 text-sm">
            <div>
              <dt className="text-ember-900/50">SKU</dt>
              <dd className="font-medium text-ember-900">{product.sku}</dd>
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
              <h2 className="mb-2 text-lg font-semibold text-ember-900">Description</h2>
              <p className="whitespace-pre-line text-sm text-ember-900/70">{product.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-ember-900/70">
              Qty
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="rounded-lg border border-ember-200 px-3 py-2 text-sm"
                disabled={!isAuthenticated || !inStock}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => addToCart.mutate()}
              disabled={!isAuthenticated || !inStock || addToCart.isPending}
              className="rounded-lg bg-ember-600 px-6 py-2.5 font-semibold text-white hover:bg-ember-700 disabled:opacity-50"
            >
              {addToCart.isPending ? 'Adding…' : 'Add to cart'}
            </button>
            <button
              onClick={() => addToWishlist.mutate()}
              disabled={!isAuthenticated || addToWishlist.isPending}
              className="rounded-lg border border-ember-300 px-6 py-2.5 font-semibold text-ember-700 hover:bg-ember-50 disabled:opacity-50"
            >
              {addToWishlist.isPending ? 'Saving…' : 'Add to wishlist'}
            </button>
          </div>

          {!isAuthenticated && (
            <p className="mt-4 text-sm text-ember-900/60">
              <Link to="/profile" className="font-medium text-ember-700 underline">Sign in</Link> to add
              items to your cart or wishlist.
            </p>
          )}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </section>
  );
}