import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart } from '@/api/types';
import { AuthGate, EmptyState, ErrorState, Spinner } from '@/components/storefront-ui';
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
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Spinner label="Loading your cart…" />
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
        <h1 className="text-2xl font-bold text-orange-800">Shopping cart</h1>
        <div className="mt-4">
          <EmptyState title="Your cart is empty">
            <p>
              <Link to="/products" className="font-medium text-orange-700 underline">Browse the catalogue</Link>{' '}
              and add your favourites.
            </p>
          </EmptyState>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-orange-800">Shopping cart</h1>
      {cart.outOfStockCount > 0 && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          One or more items are out of stock and can't be ordered. Remove them or adjust quantities below.
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-4">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-4 rounded-xl border border-orange-100 bg-white p-4">
              <Link to={`/products/slug/${item.product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-orange-50">
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl" aria-hidden>
                    🎆
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col">
                <Link to={`/products/slug/${item.product.slug}`} className="font-semibold text-orange-900 hover:text-orange-700">
                  {item.product.name}
                </Link>
                <p className="text-xs text-orange-900/50">{formatUnit(item.product.unit)} · {formatMoney(item.product.basePrice)} each</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-sm text-orange-900/70">
                    Qty
                    <select
                      value={item.quantity}
                      disabled={updateQuantity.isPending}
                      onChange={(e) => updateQuantity.mutate({ itemId: item.id, quantity: Number(e.target.value) })}
                      className="rounded-lg border border-orange-200 px-2 py-1 text-sm disabled:opacity-50"
                    >
                      {Array.from({ length: item.availableStock + 1 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <div className="text-right">
                    <p className="font-bold text-orange-800">{formatMoney(item.lineTotal)}</p>
                    <button
                      onClick={() => removeItem.mutate(item.id)}
                      disabled={removeItem.isPending}
                      className="text-xs text-orange-900/50 underline hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl border border-orange-100 bg-orange-50/50 p-5">
          <h2 className="text-lg font-semibold text-orange-900">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-orange-900/60">Subtotal ({cart.totalQuantity} item{cart.totalQuantity === 1 ? '' : 's'})</dt>
              <dd className="font-medium text-orange-900">{formatMoney(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-orange-900/60">Delivery</dt>
              <dd className="text-orange-900/60">Calculated at checkout</dd>
            </div>
            <div className="flex justify-between border-t border-orange-100 pt-3 text-base">
              <dt className="font-semibold text-orange-900">Total</dt>
              <dd className="font-bold text-orange-800">{formatMoney(cart.subtotal)}</dd>
            </div>
          </dl>
          <Link
            to="/checkout"
            className="mt-5 block rounded-lg bg-orange-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-orange-700"
          >
            Proceed to checkout
          </Link>
          <button
            onClick={() => clearCart.mutate()}
            disabled={clearCart.isPending}
            className="mt-2 w-full rounded-lg border border-orange-200 px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 disabled:opacity-50"
          >
            Clear cart
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </aside>
      </div>
    </section>
  );
}