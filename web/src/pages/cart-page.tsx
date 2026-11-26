import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Send, TicketStar } from 'react-iconly';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart } from '@/api/types';
import { AuthGate, EmptyState, ErrorState, Spinner } from '@/components/storefront-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatMoney, formatUnit } from '@/lib/format';
import { usePageMeta } from '@/lib/seo';

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Server-side shopping cart with Zepto-style quantity steppers. */
export function CartPage() {
  const { isAuthenticated, isLoading } = useAuth();

  usePageMeta({ title: 'Your cart', path: '/cart', noindex: true });

  return (
    <AuthGate
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      title="Sign in to view your cart"
    >
      <CartContent />
    </AuthGate>
  );
}

function CartContent() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const onError = (err: unknown) =>
    setError(err instanceof Error ? err.message : 'Something went wrong');

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
    onSuccess: invalidate,
    onError,
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/cart/items/${itemId}`);
    },
    onSuccess: invalidate,
    onError,
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      await api.delete('/cart');
    },
    onSuccess: invalidate,
    onError,
  });

  if (cartQuery.isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <Spinner label="Loading your cart…" />
      </section>
    );
  }
  if (cartQuery.isError) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <ErrorState error={cartQuery.error} />
      </section>
    );
  }

  const cart = cartQuery.data;
  if (!cart || cart.items.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Your cart</h1>
        <div className="mt-4">
          <EmptyState title="Your cart is empty">
            <p>
              <Link to="/products" className="font-semibold text-accent underline">
                Browse the catalogue
              </Link>{' '}
              and add some everyday essentials.
            </p>
          </EmptyState>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Your cart</h1>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
            <Send className="h-4 w-4" /> Delivery in 10–15 minutes
          </p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted">
          {cart.totalQuantity} item{cart.totalQuantity === 1 ? '' : 's'}
        </span>
      </div>

      {cart.outOfStockCount > 0 && (
        <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-ink-muted">
          One or more items are out of stock and can&apos;t be ordered. Remove them or adjust
          quantities below.
        </p>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-2.5">
          {cart.items.map((item) => {
            const busy = updateQuantity.isPending || removeItem.isPending;
            const max = Math.max(1, item.availableStock);
            return (
              <li key={item.id} className="flex gap-3 rounded-lg border border-line bg-white p-3">
                <Link
                  to={`/products/slug/${item.product.slug}`}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface"
                >
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full items-center justify-center text-accent"
                      aria-hidden
                    >
                      <TicketStar className="h-7 w-7" />
                    </div>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    to={`/products/slug/${item.product.slug}`}
                    className="line-clamp-1 text-sm font-semibold text-ink hover:text-accent"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-[11px] text-ink-muted">
                    {formatUnit(item.product.unit)} · {formatMoney(item.product.basePrice)} each
                  </p>
                  {item.isOutOfStock && (
                    <p className="mt-0.5 text-[11px] font-semibold text-danger">Out of stock</p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <div className="flex h-8 items-center rounded border border-accent bg-white text-accent">
                      <button
                        type="button"
                        onClick={() => removeItem.mutate(item.id)}
                        disabled={busy}
                        aria-label={`Remove ${item.product.name} from cart`}
                        className="grid h-full w-8 place-items-center hover:bg-accent-soft disabled:opacity-50"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span
                        className="w-8 text-center text-xs font-bold tabular-nums text-ink"
                        aria-live="polite"
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity.mutate({
                            itemId: item.id,
                            quantity: Math.min(max, item.quantity + 1),
                          })
                        }
                        disabled={busy || item.quantity >= max}
                        aria-label={`Add one ${item.product.name}`}
                        className="grid h-full w-8 place-items-center hover:bg-accent-soft disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" stroke="bold" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink">{formatMoney(item.lineTotal)}</p>
                      <button
                        onClick={() => removeItem.mutate(item.id)}
                        disabled={removeItem.isPending}
                        className="text-[11px] text-ink-muted underline hover:text-danger"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-lg border border-line bg-surface-warm p-4 lg:sticky lg:top-[132px]">
          <h2 className="text-base font-semibold text-ink">Bill details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal ({cart.totalQuantity} items)</dt>
              <dd className="font-medium text-ink">{formatMoney(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Delivery</dt>
              <dd className="text-ink-muted">Calculated at checkout</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-bold text-ink">{formatMoney(cart.subtotal)}</dd>
            </div>
          </dl>
          <Link
            to="/checkout"
            className="quick-press mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent/90"
          >
            Proceed to checkout <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => clearCart.mutate()}
            disabled={clearCart.isPending}
            className="quick-press mt-2 w-full rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-muted hover:bg-surface disabled:opacity-50"
          >
            Clear cart
          </button>
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </aside>
      </div>
    </section>
  );
}
