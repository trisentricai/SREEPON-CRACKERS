import { AdminPhaseState } from '@/components/admin-phase-state';

/** Coupons — phase placeholder. */
export function CouponsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Coupons</h1>
      <AdminPhaseState title="Coupons" description="Coupon creation and usage arrive with the promotions phase." />
    </div>
  );
}