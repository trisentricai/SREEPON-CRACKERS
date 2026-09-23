import { PhaseState } from './phase-state';

/** Storefront landing page — live homepage composition arrives with the content phases. */
export function HomePage() {
  return (
    <PhaseState title="SriPon — Celebrate Responsibly">
      <p className="font-medium text-orange-700">Your one-stop shop for festive crackers &amp; fireworks.</p>
      <p className="mt-2">
        Categories, featured collections, banners, and legal/age-gate content land in the content phases. Phase 1
        delivers the running application skeleton — verify the API at <code>/health</code> and docs at{' '}
        <code>/api/docs</code>.
      </p>
    </PhaseState>
  );
}