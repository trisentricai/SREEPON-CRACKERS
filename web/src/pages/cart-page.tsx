import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart } from '@/api/types';
import { AuthGate, ErrorState } from '@/components/storefront-ui';
import { ChunkyButton, FunHeading, Mascot, StickerCard } from '@/components/sticker-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatMoney, formatUnit } from '@/lib/format';

/** Server-side shopping cart for the signed-in customer. */
export function CartPage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <AuthGate isAuthenticated={isAuthenticated} isLoading={isLoading} title="Sign in to view your cart">
      <CartContent />
    </AuthGate>
  );
}

function CartContent() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const onError = (err: unknown) => setError(err instanceof Error ? err.message : 'Something went wrong');

  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Cart>>('/cart');
      return data.data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const { data } = await api.patch<ApiEnvelope<Cart>>(`/cart/items/${itemId}`, { quantity });
      return data.data;
    },
    onSuccess: () => void invalidate(),
    onError: onError,
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/cart/items/${itemId}`);
    },
    onSuccess: () => void invalidate(),
    onError: onError,
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      await api.delete('/cart');
    },
    onSuccess: () => void invalidate(),
    onError: onError,
  });

  if (cartQuery.isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-10 w-64 animate-pulse rounded-full border-2 border-ink bg-ember-100" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
        </div>
      </section>
    );
  }
  if (cartQuery.isError) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <ErrorState error={cartQuery.error} />
      </section>
    );
  }

  const cart = cartQuery.data;
  if (!cart || cart.items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <FunHeading title="Your cart" overline="Almost boom time" />
        <StickerCard className="flex flex-col items-center gap-4 p-10 text-center">
          <Mascot className="h-24 w-auto" />
          <p className="font-display text-xl font-extrabold text-ink">Your cart is empty!</p>
          <p className="-mt-2 font-medium text-ink-muted">Let&apos;s fix that with something that sparkles.</p>
          <ChunkyButton to="/products">Browse the fun</ChunkyButton>
        </StickerCard>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <FunHeading
        title="Your cart"
        subtitle={`${cart.totalQuantity} pop${cart.totalQuantity === 1 ? '' : 's'} ready to boom.`}
        overline="Almost boom time"
      />
      {cart.outOfStockCount > 0 && (
        <StickerCard className="mb-6 border-ink bg-candy-100 p-4 text-sm font-bold text-ink">
          One or more items are out of stock and can&apos;t be ordered. Remove them or adjust quantities below.
        </StickerCard>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-4">
          {cart.items.map((item) => (
            <li key={item.id}>
              <StickerCard className="flex gap-4 p-3">
                <Link
                  to={`/products/slug/${item.product.slug}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-ink bg-sunny-100"
                >
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" aria-hidden>
                      <span className="font-display text-3xl font-extrabold text-ink/20">
                        {item.product.name.slice(0, 1)}
                      </span>
                    </div>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    to={`/products/slug/${item.product.slug}`}
                    className="truncate font-display font-bold text-ink hover:text-coral-600"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-xs font-bold text-ink-muted">
                    {formatUnit(item.product.unit)} · {formatMoney(item.product.basePrice)} each
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <div className="flex items-center rounded-full border-2 border-ink bg-white shadow-sticker-sm">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={updateQuantity.isPending || item.quantity <= 1}
                        onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                        className="flex h-8 w-8 items-center justify-center rounded-l-full transition hover:bg-sunny-100 active:scale-95 disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                      <span className="w-7 text-center font-display text-sm font-extrabold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={updateQuantity.isPending || item.quantity >= item.availableStock}
                        onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                        className="flex h-8 w-8 items-center justify-center rounded-r-full transition hover:bg-sunny-100 active:scale-95 disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-extrabold text-ink">{formatMoney(item.lineTotal)}</p>
                      <button
                        onClick={() => removeItem.mutate(item.id)}
                        disabled={removeItem.isPending}
                        className="inline-flex items-center gap-1 text-xs font-bold text-ink-muted underline hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </StickerCard>
            </li>
          ))}
        </ul>

        <aside>
          <StickerCard className="h-fit bg-sunny-100 p-5">
            <h2 className="font-display text-lg font-extrabold text-ink">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm font-medium">
              <div className="flex justify-between">
                <dt className="text-ink-muted">
                  Subtotal ({cart.totalQuantity} item{cart.totalQuantity === 1 ? '' : 's'})
                </dt>
                <dd className="font-bold text-ink">{formatMoney(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Delivery</dt>
                <dd className="text-ink-muted">Calculated at checkout</dd>
              </div>
              <div className="flex justify-between border-t-2 border-ink/15 pt-3 text-base">
                <dt className="font-display font-extrabold text-ink">Total</dt>
                <dd className="font-display font-extrabold text-coral-600">{formatMoney(cart.subtotal)}</dd>
              </div>
            </dl>
            <ChunkyButton to="/checkout" tone="coral" className="mt-5 w-full">
              Proceed to checkout
            </ChunkyButton>
            <button
              onClick={() => clearCart.mutate()}
              disabled={clearCart.isPending}
              className="mt-2 w-full rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-candy-100 active:translate-y-0.5 disabled:opacity-50"
            >
              Clear cart
            </button>
            {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
          </StickerCard>
        </aside>
      </div>
    </section>
  );
}
