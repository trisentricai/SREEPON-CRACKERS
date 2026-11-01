import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ApiEnvelope, CategoryPerformance, OrdersPoint, RevenuePoint, TopProduct } from '@/api/types';
import { Card, EmptyState, ErrorState, Spinner } from '@/components/admin-ui';
import { formatMoney } from '@/lib/format';

type DayRange = 7 | 30 | 90;

function useAnalytics(days: DayRange) {
  const revenue = useQuery({
    queryKey: ['analytics-revenue', days],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<RevenuePoint[]>>('/admin/analytics/revenue', {
        params: { days },
      });
      return data.data;
    },
  });
  const orders = useQuery({
    queryKey: ['analytics-orders', days],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<OrdersPoint[]>>('/admin/analytics/orders', {
        params: { days },
      });
      return data.data;
    },
  });
  const topProducts = useQuery({
    queryKey: ['analytics-top-products', days],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<TopProduct[]>>('/admin/analytics/top-products', {
        params: { days, limit: 10 },
      });
      return data.data;
    },
  });
  const categories = useQuery({
    queryKey: ['analytics-categories', days],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<CategoryPerformance[]>>('/admin/analytics/categories', {
        params: { days },
      });
      return data.data;
    },
  });
  return { revenue, orders, topProducts, categories };
}

/* ---------- Revenue line chart (SVG) ---------- */
function RevenueLineChart({ points }: { points: RevenuePoint[] }) {
  const width = 600;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 32, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = points.map((p) => Number(p.revenue));
  const max = Math.max(1, ...values);
  const min = 0;
  const n = points.length;
  const stepX = n > 1 ? innerW / (n - 1) : innerW;

  const coords = points.map((p, i) => {
    const x = pad.left + i * stepX;
    const y = pad.top + innerH - ((Number(p.revenue) - min) / (max - min)) * innerH;
    return { x, y, p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = coords.length
    ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${pad.top + innerH} L ${coords[0].x.toFixed(1)} ${pad.top + innerH} Z`
    : '';

  // y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: max * f, y: pad.top + innerH - f * innerH }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Revenue over time">
      <defs>
        <linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4338ca" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} x2={width - pad.right} y1={t.y} y2={t.y} stroke="#e2e8f0" strokeDasharray="3 3" />
          <text x={pad.left - 6} y={t.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
            {Math.round(t.v)}
          </text>
        </g>
      ))}
      <path d={areaPath} fill="url(#revGrad)" />
      <path d={linePath} fill="none" stroke="#4338ca" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" fill="#4338ca">
          <title>{`${c.p.day}: ${formatMoney(c.p.revenue)} (${c.p.orders} orders)`}</title>
        </circle>
      ))}
      {points.length > 0 && (
        <>
          <text x={pad.left} y={height - 8} fontSize="10" fill="#94a3b8">
            {points[0].day}
          </text>
          <text x={width - pad.right} y={height - 8} textAnchor="end" fontSize="10" fill="#94a3b8">
            {points[points.length - 1].day}
          </text>
        </>
      )}
    </svg>
  );
}

/* ---------- Orders bar chart (SVG) ---------- */
function OrdersBarChart({ points }: { points: OrdersPoint[] }) {
  const width = 600;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 32, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.map((p) => p.orders));
  const barW = points.length > 0 ? Math.max(4, innerW / points.length - 4) : 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Orders over time">
      {points.map((p, i) => {
        const x = pad.left + (innerW / points.length) * i + 2;
        const paidH = (p.paid / max) * innerH;
        const unpaidH = (p.unpaid / max) * innerH;
        return (
          <g key={i}>
            <rect x={x} y={pad.top + innerH - paidH - unpaidH} width={barW} height={paidH} fill="#4338ca" rx="2">
              <title>{`${p.day}: ${p.paid} paid`}</title>
            </rect>
            <rect x={x} y={pad.top + innerH - unpaidH} width={barW} height={unpaidH} fill="#f59e0b" rx="2">
              <title>{`${p.day}: ${p.unpaid} unpaid`}</title>
            </rect>
          </g>
        );
      })}
      <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#cbd5e1" />
    </svg>
  );
}

/* ---------- Horizontal bar list ---------- */
function HorizontalBars({
  items,
  labelKey,
  valueKey,
  max,
  color,
}: {
  items: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  max: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const value = Number(item[valueKey]);
        const pct = max > 0 ? (value / max) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-40 truncate text-slate-700" title={String(item[labelKey])}>
              {String(item[labelKey])}
            </div>
            <div className="flex-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
            <div className="w-20 text-right font-medium text-slate-800">{value}</div>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsPage() {
  const [days, setDays] = useState<DayRange>(30);
  const { revenue, orders, topProducts, categories } = useAnalytics(days);

  const loading = revenue.isLoading || orders.isLoading || topProducts.isLoading || categories.isLoading;
  const error = revenue.error || orders.error || topProducts.error || categories.error;

  const topMax = useMemo(
    () => Math.max(1, ...(topProducts.data ?? []).map((p) => p.units)),
    [topProducts.data],
  );
  const catMax = useMemo(
    () => Math.max(1, ...(categories.data ?? []).map((c) => Number(c.revenue))),
    [categories.data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Sales rate, top products, and category performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600" htmlFor="range">
            Range
          </label>
          <select
            id="range"
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as DayRange)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorState message={error instanceof Error ? error.message : 'Failed to load analytics'} />}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Revenue (paid orders)</h2>
              {(revenue.data ?? []).length === 0 ? (
                <EmptyState title="No paid orders in this range." />
              ) : (
                <RevenueLineChart points={revenue.data ?? []} />
              )}
            </Card>
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Orders (paid vs unpaid)</h2>
              {(orders.data ?? []).length === 0 ? (
                <EmptyState title="No orders in this range." />
              ) : (
                <OrdersBarChart points={orders.data ?? []} />
              )}
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-indigo-700" /> Paid
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Unpaid
                </span>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Top products by units sold</h2>
              {(topProducts.data ?? []).length === 0 ? (
                <EmptyState title="No product sales yet." />
              ) : (
                <HorizontalBars
                  items={(topProducts.data ?? []).map((p) => ({ name: p.name, units: p.units, revenue: p.revenue }))}
                  labelKey="name"
                  valueKey="units"
                  max={topMax}
                  color="#4338ca"
                />
              )}
              {(topProducts.data ?? []).length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-1.5">Product</th>
                        <th className="py-1.5">SKU</th>
                        <th className="py-1.5 text-right">Units</th>
                        <th className="py-1.5 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(topProducts.data ?? []).map((p) => (
                        <tr key={p.productId}>
                          <td className="py-1.5 font-medium text-slate-800">{p.name}</td>
                          <td className="py-1.5 text-slate-500">{p.sku}</td>
                          <td className="py-1.5 text-right">{p.units}</td>
                          <td className="py-1.5 text-right">{formatMoney(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Category performance (revenue)</h2>
              {(categories.data ?? []).length === 0 ? (
                <EmptyState title="No category sales yet." />
              ) : (
                <HorizontalBars
                  items={(categories.data ?? []).map((c) => ({ name: c.name, units: Number(c.revenue), revenue: c.revenue }))}
                  labelKey="name"
                  valueKey="units"
                  max={catMax}
                  color="#ff8a3d"
                />
              )}
              {(categories.data ?? []).length > 0 && (
                <div className="mt-4 space-y-1 text-xs text-slate-600">
                  {(categories.data ?? []).map((c) => (
                    <div key={c.categoryId} className="flex justify-between">
                      <span>{c.name}</span>
                      <span className="font-medium">{formatMoney(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
