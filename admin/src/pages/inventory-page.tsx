import { AdminPhaseState } from '@/components/admin-phase-state';

/** Inventory — phase placeholder. */
export function InventoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
      <AdminPhaseState title="Inventory" description="Stock levels and low-stock alerts arrive with the inventory phase." />
    </div>
  );
}