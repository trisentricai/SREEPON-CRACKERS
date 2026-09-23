import { AdminPhaseState } from '@/components/admin-phase-state';

/** Products — phase placeholder. */
export function ProductsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Products</h1>
      <AdminPhaseState title="Products" description="CRUD for the catalog arrives with the products phase." />
    </div>
  );
}