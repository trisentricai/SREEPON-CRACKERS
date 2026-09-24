import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, InvoiceData, Order, OrderItem } from '@/api/types';
import { Badge, EmptyState, ErrorState, SectionHeading, Spinner } from '@/components/storefront-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatDateTime, formatMoney } from '@/lib/format';
import { OrderStatusBadge, PaymentBadge } from './orders-page';

const CANCELABLE = ['PENDING', 'CONFIRMED', 'PROCESSING'];

/** Full order detail with cancel / return / invoice actions. */
export function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.orderId!;
  const { isAuthenticated, isLoading } = useAuth();

  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [showReturn, setShowReturn] = useState(false);
  const [error, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ['my-order', orderId],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Order>>(`/orders/${orderId}`);
      return data.data;
    },
  });

  const onError = (err: unknown) => setMessage(err instanceof Error ? err.message : 'Something went wrong');

  const cancelOrder = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiEnvelope<Order>>(`/orders/${orderId}/cancel`, {
        ...(cancelReason.trim() ? { reason: cancelReason.trim() } : {}),
      });
      return data.data;
    },
    onSuccess: (order) => {
      void queryClient.setQueryData(['my-order', orderId], order);
      setShowCancel(false);
      setMessage(null);
    },
    onError,
  });

  const requestReturn = useMutation({
    mutationFn: async (item: OrderItem) => {
      if (!returnReason.trim()) throw new Error('A reason is required');
      const { data } = await api.post<ApiEnvelope<Order>>(`/orders/${orderId}/return-request`, {
        ...(item.productId ? { productId: item.productId } : {}),
        reason: returnReason.trim(),
      });
      return data.data;
    },
    onSuccess: (order) => {
      void queryClient.setQueryData(['my-order', orderId], order);
      setShowReturn(false);
      setReturnReason('');
      setMessage(null);
    },
    onError,
  });

  const downloadInvoice = useMutation({
    mutationFn: async () => {
      const { data } = await api.get<ApiEnvelope<InvoiceData>>(`/orders/${orderId}/invoice`);
      return data.data;
    },
    onSuccess: (invoice) => {
      const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoice.invoiceNumber}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onError,
  });

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Spinner label="Checking your session…" />
      </section>
    );
  }
  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16">
        <EmptyState title="Sign in to view this order">
          <p>
            <Link to="/profile" className="font-medium text-orange-700 underline">Sign in</Link> to continue.
          </p>
        </EmptyState>
      </section>
    );
  }
  if (orderQuery.isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Spinner label="Loading order…" />
      </section>
    );
  }
  if (orderQuery.isError || !orderQuery.data) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <ErrorState error={orderQuery.error} />
      </section>
    );
  }

  const order = orderQuery.data;
  const cancellable = CANCELABLE.includes(order.status) && ['PENDING', 'FAILED'].includes(order.paymentStatus);
  const returnable = order.status === 'DELIVERED';

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-sm text-orange-900/50">
        <Link to="/orders" className="hover:text-orange-700">Orders</Link> /{' '}
        <span className="text-orange-900/70">{order.orderNumber}</span>
      </nav>

      <header className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold text-orange-800">{order.orderNumber}</h1>
        <OrderStatusBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus} />
        <span className="text-sm text-orange-900/50">{formatDateTime(order.createdAt)}</span>
      </header>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <SectionHeading title="Items" />
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="rounded-xl border border-orange-100 bg-white p-3">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-orange-50">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xl" aria-hidden>
                        🎆
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900">{item.productName}</p>
                    <p className="text-xs text-orange-900/50">{item.sku} · {item.unit} · ×{item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-800">{formatMoney(item.lineTotal)}</p>
                    {returnable && (
                      <button
                        onClick={() => {
                          setReturnReason('');
                          setShowReturn((v) => !v);
                        }}
                        className="text-xs text-orange-900/50 underline hover:text-orange-700"
                      >
                        Request return
                      </button>
                    )}
                  </div>
                </div>
                {showReturn && (
                  <form
                    className="mt-3 flex gap-2 border-t border-orange-100 pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      requestReturn.mutate(item);
                    }}
                  >
                    <input
                      required
                      placeholder="Reason for return"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="flex-1 rounded-lg border border-orange-200 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={requestReturn.isPending}
                      className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                      {requestReturn.isPending ? 'Sending…' : 'Submit'}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>

          {order.returnRequests.length > 0 && (
            <div className="mt-6">
              <SectionHeading title="Return requests" />
              <ul className="space-y-2 text-sm">
                {order.returnRequests.map((request) => (
                  <li key={request.id} className="rounded-lg border border-orange-100 bg-orange-50/50 p-3">
                    <p className="font-medium text-orange-900">{request.status.replace(/_/g, ' ')}</p>
                    <p className="mt-0.5 text-orange-900/60">{request.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-5">
            <SectionHeading title="Totals" />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-orange-900/60">Subtotal</dt>
                <dd>{formatMoney(order.subtotal)}</dd>
              </div>
              {order.discount !== '0.00' && (
                <div className="flex justify-between">
                  <dt className="text-orange-900/60">Discount{order.coupon ? ` (${order.coupon.code})` : ''}</dt>
                  <dd className="text-green-700">−{formatMoney(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-orange-900/60">Delivery</dt>
                <dd>{formatMoney(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-orange-900/60">Tax</dt>
                <dd>{formatMoney(order.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-orange-100 pt-3 text-base">
                <dt className="font-semibold text-orange-900">Grand total</dt>
                <dd className="font-bold text-orange-800">{formatMoney(order.grandTotal)}</dd>
              </div>
            </dl>
          </div>

          {order.address && (
            <div className="rounded-xl border border-orange-100 bg-white p-5 text-sm">
              <SectionHeading title="Deliver to" />
              <p className="font-medium text-orange-900">{order.address.fullName}</p>
              <p className="mt-1 text-orange-900/70">
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ''}
                <br />
                {order.address.city}, {order.address.state} {order.address.pincode}
                <br />
                {order.address.country}
                <br />
                {order.address.phone}
              </p>
            </div>
          )}

          {order.payments.length > 0 && (
            <div className="rounded-xl border border-orange-100 bg-white p-5 text-sm">
              <SectionHeading title="Payments" />
              <ul className="space-y-2">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between">
                    <span className="text-orange-900/70">{payment.provider}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-orange-900">{formatMoney(payment.amount)}</span>
                      <Badge tone={payment.status === 'PAID' ? 'green' : payment.status === 'FAILED' ? 'red' : 'amber'}>
                        {payment.status}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.notes && (
            <div className="rounded-xl border border-orange-100 bg-white p-5 text-sm">
              <SectionHeading title="Notes" />
              <p className="whitespace-pre-line text-orange-900/70">{order.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => downloadInvoice.mutate()}
              disabled={downloadInvoice.isPending}
              className="w-full rounded-lg border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
            >
              {downloadInvoice.isPending ? 'Preparing…' : 'Download invoice'}
            </button>
            {cancellable && (
              <button
                onClick={() => setShowCancel((v) => !v)}
                className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Cancel order
              </button>
            )}
          </div>
          {showCancel && cancellable && (
            <form
              className="rounded-xl border border-red-100 bg-red-50 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                cancelOrder.mutate();
              }}
            >
              <input
                placeholder="Reason (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={cancelOrder.isPending}
                className="mt-2 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelOrder.isPending ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}