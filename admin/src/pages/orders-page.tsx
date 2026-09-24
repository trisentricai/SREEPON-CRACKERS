import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ApiEnvelope, Invoice, OrderListResponse, OrderStatus, OrderView, PaymentStatus } from '@/api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Pagination,
  Select,
  Spinner,
  TextInput,
} from '@/components/admin-ui';
import { formatDateTime, formatMoney, titleCase } from '@/lib/format';

const LIMIT = 20;

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
];

const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

const STATUS_TONES: Record<string, string> = {
  PENDING: 'amber',
  CONFIRMED: 'blue',
  PROCESSING: 'blue',
  PACKED: 'violet',
  SHIPPED: 'violet',
  OUT_FOR_DELIVERY: 'blue',
  DELIVERED: 'green',
  CANCELLED: 'red',
  RETURN_REQUESTED: 'orange',
  RETURNED: 'slate',
};

const PAYMENT_TONES: Record<string, string> = {
  PAID: 'green',
  PENDING: 'amber',
  FAILED: 'red',
  REFUNDED: 'slate',
  PARTIALLY_REFUNDED: 'orange',
};

/** Orders — list, inspect, and manage order lifecycle. */
export function OrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<OrderView | null>(null);
  const [noteText, setNoteText] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-orders', page, status, q],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<OrderListResponse>>('/admin/orders', {
        params: { page, limit: LIMIT, status: status || undefined, q: q || undefined },
      });
      return data.data;
    },
  });

  const detail = useQuery({
    queryKey: ['admin-order', selected?.id],
    queryFn: async () => {
      if (!selected?.id) return null;
      const { data } = await apiClient.get<ApiEnvelope<OrderView>>(`/admin/orders/${selected.id}`);
      return data.data;
    },
    enabled: Boolean(selected?.id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-order'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const setOrderStatus = useMutation({
    mutationFn: async (next: OrderStatus) => {
      if (!selected) return;
      const { data } = await apiClient.patch(`/admin/orders/${selected.id}/status`, { status: next });
      return data.data as OrderView;
    },
    onSuccess: () => invalidate(),
  });

  const setPaymentStatus = useMutation({
    mutationFn: async (paymentStatus: PaymentStatus) => {
      if (!selected) return;
      const { data } = await apiClient.patch(`/admin/orders/${selected.id}/payment-status`, { paymentStatus });
      return data.data as OrderView;
    },
    onSuccess: () => invalidate(),
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!selected || !noteText.trim()) return;
      const { data } = await apiClient.post(`/admin/orders/${selected.id}/notes`, { note: noteText.trim() });
      return data.data as OrderView;
    },
    onSuccess: () => {
      setNoteText('');
      invalidate();
    },
  });

  const downloadInvoice = useMutation({
    mutationFn: async () => {
      if (!selected) return null;
      const { data } = await apiClient.get<ApiEnvelope<Invoice>>(`/admin/orders/${selected.id}/invoice`);
      return data.data;
    },
    onSuccess: (invoice) => {
      if (!invoice) return;
      const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}-invoice.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const liveOrder = detail.data ?? selected;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">Track fulfilment and payment state.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(search.trim());
        }}
        className="flex max-w-md gap-2"
      >
        <TextInput
          placeholder="Order number or customer email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="w-44"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
        <Button variant="secondary" type="submit">
          Search
        </Button>
      </form>

      <Card className="overflow-hidden p-0">
        {isLoading && <Spinner />}
        {isError && <div className="p-5"><ErrorState message={error instanceof Error ? error.message : 'Failed to load orders'} /></div>}
        {!isLoading && !isError && (!data || data.items.length === 0) && (
          <div className="p-5"><EmptyState title="No orders found." /></div>
        )}
        {data && data.items.length > 0 && (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((order) => (
                  <tr key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(order)}>
                    <td className="px-4 py-3 font-medium text-slate-800">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{order.customer?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-800">{formatMoney(order.grandTotal)}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONES[order.status]}>{titleCase(order.status)}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={PAYMENT_TONES[order.paymentStatus]}>{titleCase(order.paymentStatus)}</Badge></td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={data.pagination.total} limit={LIMIT} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={Boolean(liveOrder)} onClose={() => setSelected(null)} title={liveOrder?.orderNumber ?? 'Order'} wide>
        {liveOrder && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONES[liveOrder.status]}>{titleCase(liveOrder.status)}</Badge>
              <Badge tone={PAYMENT_TONES[liveOrder.paymentStatus]}>{titleCase(liveOrder.paymentStatus)}</Badge>
              <span className="text-sm text-slate-500">Placed {formatDateTime(liveOrder.createdAt)}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
                <p className="mt-1 text-sm text-slate-800">{liveOrder.customer?.name ?? '—'}</p>
                <p className="text-sm text-slate-600">{liveOrder.customer?.email ?? '—'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Delivery address</p>
                {liveOrder.address ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {[liveOrder.address.fullName, liveOrder.address.phone].filter(Boolean).join(' · ')}
                    <br />
                    {liveOrder.address.line1}, {liveOrder.address.line2 ? `${liveOrder.address.line2}, ` : ''}
                    {liveOrder.address.city}, {liveOrder.address.state} – {liveOrder.address.pincode}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">—</p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2">Qty</th>
                    <th className="px-4 py-2">Unit price</th>
                    <th className="px-4 py-2">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liveOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-slate-800">{item.productName}</td>
                      <td className="px-4 py-2 text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-2 text-slate-600">{formatMoney(item.unitPrice)}</td>
                      <td className="px-4 py-2 text-slate-800">{formatMoney(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <p className="text-slate-500">Subtotal <span className="float-right text-slate-800">{formatMoney(liveOrder.subtotal)}</span></p>
              <p className="text-slate-500">Discount <span className="float-right text-slate-800">{formatMoney(liveOrder.discount)}</span></p>
              <p className="text-slate-500">Delivery <span className="float-right text-slate-800">{formatMoney(liveOrder.deliveryFee)}</span></p>
              <p className="font-semibold text-slate-700">Grand total <span className="float-right">{formatMoney(liveOrder.grandTotal)}</span></p>
            </div>

            <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 p-4">
              <Field label="Order status">
                <Select
                  value={liveOrder.status}
                  onChange={(e) => setOrderStatus.mutate(e.target.value as OrderStatus)}
                  className="w-48"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {titleCase(s)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Payment status">
                <Select
                  value={liveOrder.paymentStatus}
                  onChange={(e) => setPaymentStatus.mutate(e.target.value as PaymentStatus)}
                  className="w-48"
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {titleCase(s)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button variant="secondary" onClick={() => downloadInvoice.mutate()} disabled={downloadInvoice.isPending}>
                Download invoice
              </Button>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admin note</p>
              <div className="mt-2 flex gap-2">
                <TextInput
                  placeholder="e.g. delayed courier pickup…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => addNote.mutate()}
                  disabled={addNote.isPending || !noteText.trim()}
                >
                  {addNote.isPending ? 'Adding…' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}