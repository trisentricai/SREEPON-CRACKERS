import { AdminPhaseState } from '@/components/admin-phase-state';

/** Categories — phase placeholder. */
export function CategoriesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
      <AdminPhaseState title="Categories" description="Category tree management arrives with the catalog phases." />
    </div>
  );
}