import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart, WishlistItem } from '@/api/types';
import { AuthGate, ErrorState } from '@/components/storefront-ui';
import { ChunkyButton, FunChip, FunHeading, Mascot, StickerCard } from '@/components/sticker-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatMoney, formatUnit } from '@/lib/format';

/** The signed-in customer's wishlist with move-to-cart actions. */
export function WishlistPage() {
  const { isAuthenticated, isLoading } = useAuth();

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
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-10 w-64 animate-pulse rounded-full border-2 border-ink bg-ember-100" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
          ))}
        </div>
      </section>
    );
  }
  if (wishlistQuery.isError) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <ErrorState error={wishlistQuery.error} />
      </section>
    );
  }

  const items = wishlistQuery.data ?? [];
  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <FunHeading title="Wishlist" overline="Saved for later" />
        <StickerCard className="flex flex-col items-center gap-4 p-10 text-center">
          <Mascot className="h-24 w-auto" />
          <p className="font-display text-xl font-extrabold text-ink">Nothing saved yet!</p>
          <p className="-mt-2 font-medium text-ink-muted">Tap the heart on anything you like and it&apos;ll wait here.</p>
          <ChunkyButton to="/products">Find something fun</ChunkyButton>
        </StickerCard>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <FunHeading
        title={`Wishlist (${items.length})`}
        subtitle="Your hand-picked boom box."
        overline="Saved for later"
      />
      {error && (
        <StickerCard className="mb-4 border-ink bg-candy-100 p-3 text-sm font-bold text-ink">{error}</StickerCard>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <StickerCard key={item.id} className="flex flex-col p-4">
            <Link to={`/products/slug/${item.product.slug}`} className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-ink bg-sunny-100">
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center" aria-hidden>
                    <span className="font-display text-2xl font-extrabold text-ink/20">
                      {item.product.name.slice(0, 1)}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-display font-bold text-ink">{item.product.name}</h2>
                <p className="mt-0.5 text-xs font-bold text-ink-muted">{formatUnit(item.product.unit)}</p>
              </div>
            </Link>
            <div className="mt-3 flex items-center justify-between">
              <p className="font-display text-lg font-extrabold text-coral-600">{formatMoney(item.product.basePrice)}</p>
              {!item.isAvailable && <FunChip icon={Trash2} label="Out of stock" tone="white" />}
            </div>
            <div className="mt-3 flex gap-2">
              <ChunkyButton
                onClick={() => moveToCart.mutate(item.product.id)}
                tone="sunny"
                disabled={!item.isAvailable || moveToCart.isPending}
                className="flex-1 px-3 py-2 text-sm"
              >
                <ShoppingBag className="h-4 w-4" />
                Move to cart
              </ChunkyButton>
              <button
                onClick={() => removeItem.mutate(item.product.id)}
                disabled={removeItem.isPending}
                aria-label={`Remove ${item.product.name} from wishlist`}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-white shadow-sticker-sm transition hover:bg-candy-100 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </StickerCard>
        ))}
      </div>
    </section>
  );
}
