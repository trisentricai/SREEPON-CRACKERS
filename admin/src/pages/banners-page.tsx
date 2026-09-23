import { AdminPhaseState } from '@/components/admin-phase-state';

/** Banners — phase placeholder. */
export function BannersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Banners</h1>
      <AdminPhaseState title="Banners" description="Homepage banner management arrives with the content phases." />
    </div>
  );
}