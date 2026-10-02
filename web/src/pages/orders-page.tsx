import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, OrderListResponse, OrderStatus, PaymentStatusValue } from '@/api/types';
import { AuthGate, ErrorState } from '@/components/storefront-ui';
import { ChunkyButton, FunHeading, Mascot, StickerCard } from '@/components/sticker-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatDateTime, formatMoney } from '@/lib/format';

const LIMIT = 15;

type PillTone = 'white' | 'sunny' | 'bubble' | 'grape' | 'mint' | 'candy';

const PILL_TONES: Record<PillTone, string> = {
  white: 'bg-white',
  sunny: 'bg-sunny-100',
  bubble: 'bg-bubble-100',
  grape: 'bg-grape-100',
  mint: 'bg-mint-100',
  candy: 'bg-candy-100',
};

export function StatusPill({ label, tone = 'white' }: { label: string; tone?: PillTone }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink shadow-sticker-sm ${PILL_TONES[tone]}`}
    >
      {label}
    </span>
  );
}

/** The signed-in customer's order history. */
export function OrdersPage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <AuthGate isAuthenticated={isAuthenticated} isLoading={isLoading} title="Sign in to view your orders">
      <OrdersContent />
    </AuthGate>
  );
}

function OrdersContent() {
  const [page, setPage] = useState(1);

  const ordersQuery = useQuery({
    queryKey: ['my-orders', page],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<OrderListResponse>>('/orders', {
        params: { page, limit: LIMIT },
      });
      return data.data;
    },
  });

  if (ordersQuery.isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-10 w-64 animate-pulse rounded-full border-2 border-ink bg-ember-100" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
          ))}
        </div>
      </section>
    );
  }
  if (ordersQuery.isError) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <ErrorState error={ordersQuery.error} />
      </section>
    );
  }

  const { items, pagination } = ordersQuery.data ?? { items: [] as OrderListResponse['items'], pagination: { page: 1, limit: LIMIT, total: 0, pages: 1 } };

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <FunHeading title="Orders" overline="Where's my boom?" />
        <StickerCard className="flex flex-col items-center gap-4 p-10 text-center">
          <Mascot className="h-24 w-auto" />
          <p className="font-display text-xl font-extrabold text-ink">No orders yet!</p>
          <p className="-mt-2 font-medium text-ink-muted">Your fireworks-to-be will line up here.</p>
          <ChunkyButton to="/products">Place your first order</ChunkyButton>
        </StickerCard>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <FunHeading title="Your orders" subtitle="Follow every box to your door." overline="Where's my boom?" />
      <ul className="mt-6 space-y-4">
        {items.map((order) => (
          <li key={order.id}>
            <Link to={`/orders/${order.id}`}>
              <StickerCard className="flex flex-col gap-3 p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-sticker-lg sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="inline-block rounded-lg border-2 border-ink bg-sunny-100 px-2 py-0.5 font-mono text-sm font-bold text-ink">
                    {order.orderNumber}
                  </p>
                  <p className="mt-1 text-xs font-bold text-ink-muted">{formatDateTime(order.createdAt)}</p>
                  <p className="mt-1 truncate text-sm font-medium text-ink-muted">
                    {order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.items[0]?.productName}
                    {order.items.length > 1 ? ' +' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-extrabold text-ink">{formatMoney(order.grandTotal)}</p>
                  <OrderStatusBadge status={order.status} />
                  <PaymentBadge status={order.paymentStatus} />
                </div>
              </StickerCard>
            </Link>
          </li>
        ))}
      </ul>

      {pagination.pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full border-2 border-ink bg-white px-4 py-1.5 text-sm font-bold shadow-sticker-sm transition hover:bg-sunny-100 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none"
          >
            ← Prev
          </button>
          <span className="rounded-full border-2 border-ink bg-sunny-100 px-3 py-1 text-sm font-bold">
            {pagination.page} / {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border-2 border-ink bg-white px-4 py-1.5 text-sm font-bold shadow-sticker-sm transition hover:bg-sunny-100 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none"
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const toneMap: Record<OrderStatus, PillTone> = {
    PENDING: 'sunny',
    CONFIRMED: 'bubble',
    PROCESSING: 'bubble',
    PACKED: 'bubble',
    SHIPPED: 'grape',
    OUT_FOR_DELIVERY: 'grape',
    DELIVERED: 'mint',
    CANCELLED: 'candy',
    RETURN_REQUESTED: 'sunny',
    RETURNED: 'candy',
  };
  return <StatusPill label={status.replace(/_/g, ' ')} tone={toneMap[status] ?? 'white'} />;
}

export function PaymentBadge({ status }: { status: PaymentStatusValue }) {
  const toneMap: Record<PaymentStatusValue, PillTone> = {
    PENDING: 'sunny',
    PAID: 'mint',
    FAILED: 'candy',
    REFUNDED: 'white',
    PARTIALLY_REFUNDED: 'white',
  };
  return <StatusPill label={`Payment ${status.replace(/_/g, ' ')}`} tone={toneMap[status] ?? 'white'} />;
}
