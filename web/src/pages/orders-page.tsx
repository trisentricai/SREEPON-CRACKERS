import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, OrderListResponse, OrderStatus, PaymentStatusValue } from '@/api/types';
import { AuthGate, Badge, EmptyState, ErrorState, Spinner } from '@/components/storefront-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatDateTime, formatMoney } from '@/lib/format';

const LIMIT = 15;

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
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Spinner label="Loading your orders…" />
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
        <h1 className="text-2xl font-bold text-orange-800">Orders</h1>
        <div className="mt-4">
          <EmptyState title="No orders yet">
            <p>
              <Link to="/products" className="font-medium text-orange-700 underline">Browse the catalogue</Link> and
              place your first order.
            </p>
          </EmptyState>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-orange-800">Orders</h1>
      <ul className="mt-6 space-y-4">
        {items.map((order) => (
          <li key={order.id}>
            <Link
              to={`/orders/${order.id}`}
              className="flex flex-col gap-3 rounded-xl border border-orange-100 bg-white p-4 transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-sm font-semibold text-orange-900">{order.orderNumber}</p>
                <p className="mt-0.5 text-xs text-orange-900/50">{formatDateTime(order.createdAt)}</p>
                <p className="mt-1 text-sm text-orange-900/70">
                  {order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.items[0]?.productName}
                  {order.items.length > 1 ? ' +' : ''}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-bold text-orange-800">{formatMoney(order.grandTotal)}</p>
                <OrderStatusBadge status={order.status} />
                <PaymentBadge status={order.paymentStatus} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {pagination.pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-orange-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-2 text-sm text-orange-900/60">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-orange-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const toneMap: Record<OrderStatus, 'orange' | 'blue' | 'green' | 'red' | 'neutral'> = {
    PENDING: 'neutral',
    CONFIRMED: 'blue',
    PROCESSING: 'blue',
    PACKED: 'blue',
    SHIPPED: 'blue',
    OUT_FOR_DELIVERY: 'blue',
    DELIVERED: 'green',
    CANCELLED: 'red',
    RETURN_REQUESTED: 'neutral',
    RETURNED: 'red',
  };
  return <Badge tone={toneMap[status] ?? 'neutral'}>{status.replace(/_/g, ' ')}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatusValue }) {
  const toneMap: Record<PaymentStatusValue, 'orange' | 'green' | 'red' | 'amber' | 'neutral'> = {
    PENDING: 'amber',
    PAID: 'green',
    FAILED: 'red',
    REFUNDED: 'neutral',
    PARTIALLY_REFUNDED: 'neutral',
  };
  return <Badge tone={toneMap[status] ?? 'neutral'}>Payment {status.replace(/_/g, ' ')}</Badge>;
}