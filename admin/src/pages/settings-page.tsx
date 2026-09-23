import { AdminPhaseState } from '@/components/admin-phase-state';

/** Settings — phase placeholder. */
export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
      <AdminPhaseState title="Settings" description="Store settings, profile, and image uploads arrive with the settings phase." />
    </div>
  );
}