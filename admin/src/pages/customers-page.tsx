import { AdminPhaseState } from '@/components/admin-phase-state';

/** Customers — phase placeholder. */
export function CustomersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
      <AdminPhaseState title="Customers" description="Customer directory and detail arrive with the commerce phases." />
    </div>
  );
}