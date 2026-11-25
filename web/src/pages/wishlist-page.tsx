import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart, WishlistItem } from '@/api/types';
import { AuthGate, EmptyState, ErrorState, Spinner } from '@/components/storefront-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatMoney, formatUnit } from '@/lib/format';
import { usePageMeta } from '@/lib/seo';

/** The signed-in customer's wishlist with move-to-cart actions. */
export function WishlistPage() {
  const { isAuthenticated, isLoading } = useAuth();

  usePageMeta({ title: 'Your wishlist', path: '/wishlist', noindex: true });

  return (
    <AuthGate isAuthenticated={isAuthenticated} isLoading={isLoading} title="Sign in to view your wishlist">
      <WishlistContent />
    </AuthGate>
  );
}

function WishlistContent() {
  const queryClient = useQueryClient();
  const [error, setMessage] = useState<string | null>(null);
  const onError = (err: unknown) => setMessage(err instanceof Error ? err.message : 'Something went wrong');

  const wishlistQuery = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<WishlistItem[]>>('/wishlist');
      return data.data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wishlist'] });

  const removeItem = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/wishlist/items/${productId}`);
    },
    onSuccess: () => void invalidate(),
    onError,
  });

  const moveToCart = useMutation({
    mutationFn: async (productId: string) => {
      const { data } = await api.post<ApiEnvelope<Cart>>(`/wishlist/items/${productId}/move-to-cart`);
      return data.data;
    },
    onSuccess: () => {
      void invalidate();
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError,
  });

  if (wishlistQuery.isLoading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <Spinner label="Loading your wishlist…" />
      </section>
    );
  }
  if (wishlistQuery.isError) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <ErrorState error={wishlistQuery.error} />
      </section>
    );
  }

  const items = wishlistQuery.data ?? [];
  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-3xl font-semibold text-ink">Wishlist</h1>
        <div className="mt-4">
          <EmptyState title="Your wishlist is empty">
            <p>
              <Link to="/products" className="font-medium text-accent underline">Browse the catalogue</Link>{' '}
              and save the items you like.
            </p>
          </EmptyState>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold text-ink">Wishlist ({items.length})</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="flex flex-col rounded-3xl border border-line bg-white p-4">
            <Link to={`/products/slug/${item.product.slug}`} className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface">
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl" aria-hidden>
                    🛍️
                  </div>
                )}
              </div>
              <div>
                <h2 className="font-semibold text-ink hover:text-accent">{item.product.name}</h2>
                <p className="text-xs text-ink-muted">{formatUnit(item.product.unit)}</p>
              </div>
            </Link>
            <div className="mt-3 flex items-end justify-between">
              <p className="font-bold text-ink">{formatMoney(item.product.basePrice)}</p>
              {!item.isAvailable && <p className="text-xs font-medium text-red-600">Out of stock</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => moveToCart.mutate(item.product.id)}
                disabled={!item.isAvailable || moveToCart.isPending}
                className="flex-1 pill-cta rounded-full bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Move to cart
              </button>
              <button
                onClick={() => removeItem.mutate(item.product.id)}
                disabled={removeItem.isPending}
                className="rounded-lg border border-flame-200 px-3 py-2 text-sm text-accent hover:bg-accent-soft disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}