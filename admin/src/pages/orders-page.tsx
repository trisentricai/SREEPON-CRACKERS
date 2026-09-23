import { AdminPhaseState } from '@/components/admin-phase-state';

/** Orders — phase placeholder. */
export function OrdersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
      <AdminPhaseState title="Orders" description="Order review, status transitions, and invoices arrive with the commerce phases." />
    </div>
  );
}