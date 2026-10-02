import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, InvoiceData, Order, OrderItem } from '@/api/types';
import { AuthGate, ErrorState } from '@/components/storefront-ui';
import { ChunkyButton, FunHeading, StickerCard } from '@/components/sticker-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatDateTime, formatMoney } from '@/lib/format';
import { OrderStatusBadge, PaymentBadge } from './orders-page';

const CANCELABLE = ['PENDING', 'CONFIRMED', 'PROCESSING'];

/** Full order detail with cancel / return / invoice actions. */
export function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.orderId!;
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <AuthGate isAuthenticated={isAuthenticated} isLoading={isLoading} title="Sign in to view this order">
      <OrderDetailsContent orderId={orderId} />
    </AuthGate>
  );
}

function OrderDetailsContent({ orderId }: { orderId: string }) {
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

  if (orderQuery.isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-10 w-64 animate-pulse rounded-full border-2 border-ink bg-ember-100" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="h-96 animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
          <div className="h-64 animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
        </div>
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
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <Link
          to="/orders"
          className="rounded-full border-2 border-ink bg-white px-3 py-0.5 text-ink shadow-sticker-sm transition hover:bg-sunny-100"
        >
          Orders
        </Link>
        <span className="rounded-full border-2 border-ink bg-sunny-100 px-3 py-0.5 font-mono text-ink">
          {order.orderNumber}
        </span>
      </nav>

      <header className="mt-4 flex flex-wrap items-center gap-2">
        <h1 className="font-mono text-2xl font-extrabold text-ink">{order.orderNumber}</h1>
        <OrderStatusBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus} />
        <span className="text-sm font-bold text-ink-muted">{formatDateTime(order.createdAt)}</span>
      </header>
      {error && (
        <StickerCard className="mt-4 border-ink bg-candy-100 p-3 text-sm font-bold text-ink">{error}</StickerCard>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <FunHeading title="Items" overline="In this box" />
          <ul className="mt-4 space-y-3">
            {order.items.map((item) => (
              <li key={item.id}>
                <StickerCard className="p-3">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-ink bg-sunny-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center" aria-hidden>
                          <span className="font-display text-xl font-extrabold text-ink/20">
                            {item.productName.slice(0, 1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-bold text-ink">{item.productName}</p>
                      <p className="text-xs font-bold text-ink-muted">{item.sku} · {item.unit} · ×{item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-extrabold text-ink">{formatMoney(item.lineTotal)}</p>
                      {returnable && (
                        <button
                          onClick={() => {
                            setReturnReason('');
                            setShowReturn((v) => !v);
                          }}
                          className="text-xs font-bold text-ink-muted underline hover:text-coral-600"
                        >
                          Request return
                        </button>
                      )}
                    </div>
                  </div>
                  {showReturn && (
                    <form
                      className="mt-3 flex gap-2 border-t-2 border-ink/10 pt-3"
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
                        className="flex-1 rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-medium shadow-sticker-sm placeholder:text-ink-muted/60 focus:outline-none"
                      />
                      <ChunkyButton type="submit" tone="sunny" disabled={requestReturn.isPending} className="px-4 py-2 text-sm">
                        {requestReturn.isPending ? 'Sending…' : 'Submit'}
                      </ChunkyButton>
                    </form>
                  )}
                </StickerCard>
              </li>
            ))}
          </ul>

          {order.returnRequests.length > 0 && (
            <div className="mt-6">
              <FunHeading title="Return requests" overline="In progress" />
              <ul className="mt-4 space-y-2 text-sm">
                {order.returnRequests.map((request) => (
                  <li key={request.id}>
                    <StickerCard className="bg-grape-100 p-3">
                      <p className="font-display font-bold text-ink">{request.status.replace(/_/g, ' ')}</p>
                      <p className="mt-0.5 font-medium text-ink-muted">{request.reason}</p>
                    </StickerCard>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <StickerCard className="bg-sunny-100 p-5">
            <MiniTitle>Totals</MiniTitle>
            <dl className="mt-3 space-y-2 text-sm font-medium">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-bold">{formatMoney(order.subtotal)}</dd>
              </div>
              {order.discount !== '0.00' && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Discount{order.coupon ? ` (${order.coupon.code})` : ''}</dt>
                  <dd className="font-bold text-mint-600">−{formatMoney(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Delivery</dt>
                <dd className="font-bold">{formatMoney(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Tax</dt>
                <dd className="font-bold">{formatMoney(order.tax)}</dd>
              </div>
              <div className="flex justify-between border-t-2 border-ink/15 pt-3 text-base">
                <dt className="font-display font-extrabold">Grand total</dt>
                <dd className="font-display font-extrabold text-coral-600">{formatMoney(order.grandTotal)}</dd>
              </div>
            </dl>
          </StickerCard>

          {order.address && (
            <StickerCard className="p-5 text-sm">
              <MiniTitle>Deliver to</MiniTitle>
              <p className="mt-2 font-display font-bold text-ink">{order.address.fullName}</p>
              <p className="mt-1 font-medium text-ink-muted">
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ''}
                <br />
                {order.address.city}, {order.address.state} {order.address.pincode}
                <br />
                {order.address.country}
                <br />
                {order.address.phone}
              </p>
            </StickerCard>
          )}

          {order.payments.length > 0 && (
            <StickerCard className="p-5 text-sm">
              <MiniTitle>Payments</MiniTitle>
              <ul className="mt-2 space-y-2">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink-muted">{payment.provider}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-ink">{formatMoney(payment.amount)}</span>
                      <OrderStatusPillShim status={payment.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </StickerCard>
          )}

          {order.notes && (
            <StickerCard className="p-5 text-sm">
              <MiniTitle>Notes</MiniTitle>
              <p className="mt-2 whitespace-pre-line font-medium text-ink-muted">{order.notes}</p>
            </StickerCard>
          )}

          <div className="space-y-2">
            <ChunkyButton
              onClick={() => downloadInvoice.mutate()}
              tone="white"
              disabled={downloadInvoice.isPending}
              className="w-full text-sm"
            >
              {downloadInvoice.isPending ? 'Preparing…' : 'Download invoice'}
            </ChunkyButton>
            {cancellable && (
              <button
                onClick={() => setShowCancel((v) => !v)}
                className="w-full rounded-full border-2 border-ink bg-white px-4 py-2.5 text-sm font-bold text-red-700 shadow-sticker-sm transition hover:bg-candy-100 active:translate-y-0.5 active:shadow-none"
              >
                Cancel order
              </button>
            )}
          </div>
          {showCancel && cancellable && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                cancelOrder.mutate();
              }}
            >
              <StickerCard className="bg-candy-100 p-4">
                <input
                  placeholder="Reason (optional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-medium shadow-sticker-sm placeholder:text-ink-muted/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={cancelOrder.isPending}
                  className="mt-2 w-full rounded-full border-2 border-ink bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sticker-sm transition active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                >
                  {cancelOrder.isPending ? 'Cancelling…' : 'Confirm cancellation'}
                </button>
              </StickerCard>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}

function MiniTitle({ children }: { children: string }) {
  return <h2 className="font-display text-base font-extrabold text-ink">{children}</h2>;
}

function OrderStatusPillShim({ status }: { status: string }) {
  const tone =
    status === 'PAID' ? 'bg-mint-100' : status === 'FAILED' ? 'bg-candy-100' : 'bg-sunny-100';
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border-2 border-ink px-2 py-px text-[11px] font-extrabold uppercase tracking-wide text-ink ${tone}`}
    >
      {status}
    </span>
  );
}
