import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ApiEnvelope, InventoryItem, InventoryListResponse, InventoryTransactionsResponse } from '@/api/types';
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
import { formatDateTime, titleCase } from '@/lib/format';

const LIMIT = 20;

const REASONS = ['RECOUNT', 'DAMAGE', 'RETURN', 'STOCK_IN', 'CANCELLATION', 'OTHER'] as const;

const TRANSACTION_TONES: Record<string, string> = {
  STOCK_IN: 'green',
  SALE: 'red',
  ADJUSTMENT: 'blue',
  RETURN: 'violet',
  CANCELLATION: 'orange',
};

/** Inventory — stock levels, low-stock warnings, and manual adjustments. */
export function InventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'all' | 'low'>('all');
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState<(typeof REASONS)[number]>('RECOUNT');
  const [note, setNote] = useState('');
  const [transactionsFor, setTransactionsFor] = useState<InventoryItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-inventory', page, q],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<InventoryListResponse>>('/admin/inventory', {
        params: { page, limit: LIMIT, q: q || undefined },
      });
      return data.data;
    },
    enabled: view === 'all',
  });

  const lowStock = useQuery({
    queryKey: ['admin-inventory-low'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<{ items: InventoryItem[] }>>('/admin/inventory/low-stock');
      return data.data.items;
    },
    enabled: view === 'low',
  });

  const transactions = useQuery({
    queryKey: ['admin-inventory-transactions', transactionsFor?.product.id],
    queryFn: async () => {
      if (!transactionsFor) return null;
      const { data } = await apiClient.get<ApiEnvelope<InventoryTransactionsResponse>>(
        `/admin/inventory/${transactionsFor.product.id}/transactions`,
        { params: { page: 1, limit: 20 } },
      );
      return data.data;
    },
    enabled: Boolean(transactionsFor),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-inventory-low'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const adjust = useMutation({
    mutationFn: async () => {
      if (!adjusting) return;
      const { data } = await apiClient.post(`/admin/inventory/${adjusting.product.id}/adjust`, {
        delta: Number(delta),
        reason,
        note: note.trim() || undefined,
      });
      return data;
    },
    onSuccess: () => {
      invalidate();
      setAdjusting(null);
      setDelta('');
      setNote('');
      setReason('RECOUNT');
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : 'Adjustment failed'),
  });

  function submitAdjustment() {
    setFormError(null);
    const value = Number(delta);
    if (!Number.isInteger(value) || value === 0) {
      setFormError('Delta must be a non-zero whole number.');
      return;
    }
    adjust.mutate();
  }

  const rows: InventoryItem[] | undefined = view === 'low' ? lowStock.data : data?.items;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Stock on hand, reservations, and adjustments.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-300 p-0.5">
          {(['all', 'low'] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                view === v ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {v === 'all' ? 'All stock' : 'Low stock'}
            </button>
          ))}
        </div>
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
          placeholder="Search product name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="secondary" type="submit">
          Search
        </Button>
      </form>

      <Card className="overflow-hidden p-0">
        {(isLoading || (view === 'low' && lowStock.isLoading)) && <Spinner />}
        {(isError || (view === 'low' && lowStock.isError)) && (
          <div className="p-5"><ErrorState message="Failed to load inventory." /></div>
        )}
        {!isLoading && !isError && rows && rows.length === 0 && (
          <div className="p-5">
            <EmptyState title={view === 'low' ? 'Nothing below its low-stock threshold.' : 'No inventory records.'} />
          </div>
        )}
        {rows && rows.length > 0 && (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">On hand</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Threshold</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((item) => (
                  <tr key={item.product.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{item.product.name}</p>
                      <p className="text-xs text-slate-400">{item.product.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{item.quantity}</td>
                    <td className="px-4 py-3 text-slate-500">{item.reservedQuantity}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.available}</td>
                    <td className="px-4 py-3 text-slate-500">{item.lowStockThreshold}</td>
                    <td className="px-4 py-3">
                      <Badge tone={item.isLowStock ? 'orange' : 'green'}>
                        {item.isLowStock ? 'Low stock' : 'In stock'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={() => setTransactionsFor(item)}>
                          History
                        </Button>
                        <Button variant="ghost" onClick={() => { setAdjusting(item); setFormError(null); }}>
                          Adjust
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {view === 'all' && data && (
              <Pagination page={page} total={data.pagination.total} limit={LIMIT} onChange={setPage} />
            )}
          </>
        )}
      </Card>

      <Modal open={Boolean(adjusting)} onClose={() => setAdjusting(null)} title={`Adjust stock — ${adjusting?.product.name ?? ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Current available: <span className="font-semibold text-slate-800">{adjusting?.available}</span> (
            {adjusting?.quantity} on hand, {adjusting?.reservedQuantity} reserved).
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Delta" hint="Positive adds stock, negative removes it.">
              <TextInput
                type="number"
                step="1"
                placeholder="e.g. 50 or -5"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
            </Field>
            <Field label="Reason">
              <Select value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {titleCase(r)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Note (optional)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjusting(null)}>
              Cancel
            </Button>
            <Button onClick={submitAdjustment} disabled={adjust.isPending}>
              {adjust.isPending ? 'Adjusting…' : 'Apply adjustment'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(transactionsFor)}
        onClose={() => setTransactionsFor(null)}
        title={`History — ${transactionsFor?.product.name ?? ''}`}
        wide
      >
        {transactions.isLoading && <Spinner />}
        {transactions.error && <ErrorState message="Failed to load transaction history." />}
        {transactions.data && (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Delta</th>
                  <th className="px-4 py-2">Note</th>
                  <th className="px-4 py-2">Admin</th>
                  <th className="px-4 py-2">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
                {transactions.data.items.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2"><Badge tone={TRANSACTION_TONES[t.type]}>{titleCase(t.type)}</Badge></td>
                    <td className={`px-4 py-2 font-semibold ${t.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.delta >= 0 ? '+' : ''}
                      {t.delta}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{t.note ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{t.admin?.email ?? 'system'}</td>
                    <td className="px-4 py-2 text-slate-500">{formatDateTime(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}