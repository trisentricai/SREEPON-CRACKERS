import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  ApiEnvelope,
  CustomerDetail,
  CustomerListResponse,
  CustomerOrdersListResponse,
} from '@/api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  Pagination,
  Spinner,
  TextInput,
} from '@/components/admin-ui';
import { formatDateTime, formatMoney, titleCase } from '@/lib/format';

const LIMIT = 20;

const STATUS_TONES: Record<string, string> = {
  ACTIVE: 'green',
  SUSPENDED: 'red',
  DELETED: 'slate',
};

/** Customers — account directory, detail, and order history. */
export function CustomersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string; email: string } | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-customers', page, q],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<CustomerListResponse>>('/admin/customers', {
        params: { page, limit: LIMIT, q: q || undefined },
      });
      return data.data;
    },
  });

  const detail = useQuery({
    queryKey: ['admin-customer', selected?.id],
    queryFn: async () => {
      if (!selected?.id) return null;
      const { data } = await apiClient.get<ApiEnvelope<CustomerDetail>>(`/admin/customers/${selected.id}`);
      return data.data;
    },
    enabled: Boolean(selected?.id),
  });

  const orders = useQuery({
    queryKey: ['admin-customer-orders', selected?.id],
    queryFn: async () => {
      if (!selected?.id) return null;
      const { data } = await apiClient.get<ApiEnvelope<CustomerOrdersListResponse>>(`/admin/customers/${selected.id}/orders`);
      return data.data;
    },
    enabled: Boolean(selected?.id),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">Store accounts and their order history.</p>
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
          placeholder="Search name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="secondary" type="submit">
          Search
        </Button>
      </form>

      <Card className="overflow-hidden p-0">
        {isLoading && <Spinner />}
        {isError && <div className="p-5"><ErrorState message={error instanceof Error ? error.message : 'Failed to load customers'} /></div>}
        {!isLoading && !isError && (!data || data.items.length === 0) && (
          <div className="p-5"><EmptyState title="No customers found." /></div>
        )}
        {data && data.items.length > 0 && (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((customer) => (
                  <tr
                    key={customer.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelected({ id: customer.id, email: customer.email })}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{customer.name ?? 'Unnamed'}</p>
                      <p className="text-xs text-slate-400">{customer.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{customer.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{customer.orderCount}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONES[customer.status]}>{titleCase(customer.status)}</Badge></td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(customer.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={data.pagination.total} limit={LIMIT} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.email ?? 'Customer'} wide>
        {detail.data && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-800">{detail.data.name ?? 'Unnamed'}</p>
              <Badge tone={STATUS_TONES[detail.data.status]}>{titleCase(detail.data.status)}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Orders</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">{detail.data.stats.orderCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Addresses</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">{detail.data.stats.addressCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Phone</p>
                <p className="mt-1 truncate text-slate-700">{detail.data.phone ?? '—'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Joined</p>
                <p className="mt-1 text-xs text-slate-700">{formatDateTime(detail.data.createdAt)}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent orders</p>
              {orders.data && orders.data.items.length === 0 && (
                <p className="text-sm text-slate-500">No orders yet.</p>
              )}
              <div className="space-y-2">
                {(orders.data?.items ?? detail.data.recentOrders).map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{order.orderNumber}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={STATUS_TONES[order.status.toLowerCase()]}>{titleCase(order.status)}</Badge>
                      <span className="font-semibold text-slate-800">{formatMoney(order.grandTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}