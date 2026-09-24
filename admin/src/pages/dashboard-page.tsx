import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { DashboardMetrics } from '@/api/types';
import { Badge, Card, EmptyState, ErrorState, Spinner, StatCard } from '@/components/admin-ui';
import { formatMoney } from '@/lib/format';

async function fetchDashboard(): Promise<DashboardMetrics> {
  const { data } = await apiClient.get('/admin/analytics/dashboard');
  return data.data as DashboardMetrics;
}

/** Admin dashboard — live store metrics from the analytics module. */
export function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of store performance, orders, and inventory.
        </p>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorState message={error instanceof Error ? error.message : 'Failed to load dashboard'} />}
      {!isLoading && !isError && !data && <EmptyState title="No data available yet." />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total revenue (paid)" value={formatMoney(data.revenue)} accent="text-emerald-600" />
            <StatCard label="Total orders" value={data.totalOrders} hint={`${data.paidOrders} paid`} />
            <StatCard label="Average order value" value={formatMoney(data.averageOrderValue)} />
            <StatCard label="Customers" value={data.customers} hint={`${data.newCustomersLast30Days} new in 30 days`} />
            <StatCard label="Active products" value={data.activeProducts} />
            <StatCard label="Pending orders" value={data.pendingOrdersCount} hint="awaiting fulfilment" accent={data.pendingOrdersCount > 0 ? 'text-amber-600' : 'text-slate-800'} />
            <StatCard
              label="Low stock items"
              value={data.lowStockCount}
              hint="at or below threshold"
              accent={data.lowStockCount > 0 ? 'text-orange-600' : 'text-slate-800'}
            />
            <StatCard
              label="Out of stock"
              value={data.outOfStockCount}
              accent={data.outOfStockCount > 0 ? 'text-red-600' : 'text-slate-800'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Fulfilment attention</h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.pendingOrdersCount > 0 && (
                  <Badge tone="amber">{data.pendingOrdersCount} order(s) need confirmation</Badge>
                )}
                {data.lowStockCount > 0 && (
                  <Badge tone="orange">{data.lowStockCount} low-stock product(s)</Badge>
                )}
                {data.outOfStockCount > 0 && (
                  <Badge tone="red">{data.outOfStockCount} out-of-stock product(s)</Badge>
                )}
                {data.pendingOrdersCount === 0 && data.lowStockCount === 0 && data.outOfStockCount === 0 && (
                  <p className="text-sm text-slate-500">All clear — nothing needs attention right now.</p>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-slate-700">Store status</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>
                  Revenue captured from {data.paidOrders} paid order(s); average order value reflects paid orders only.
                </p>
                <p>
                  Inventory health is measured as available units (on hand minus reserved) against each product&apos;s
                  threshold. Adjust stock from the <span className="font-medium">Inventory</span> section.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}