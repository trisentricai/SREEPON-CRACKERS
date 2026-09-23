import { AdminPhaseState } from '@/components/admin-phase-state';

/** Admin dashboard — stat tiles arrive with the analytics phase. */
export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of store performance, orders, and inventory.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Orders', 'Revenue', 'Products', 'Customers'].map((label) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-400">—</p>
            <p className="mt-1 text-xs text-slate-400">arrives with analytics phase</p>
          </div>
        ))}
      </div>

      <AdminPhaseState
        title="Live metrics"
        description="Real order/revenue/inventory stats are wired up with the analytics phase."
      />
    </div>
  );
}