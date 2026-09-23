import { PhaseState } from './phase-state';

/** Order history — status timeline and invoices arrive with the commerce phases. */
export function OrdersPage() {
  return (
    <PhaseState title="Your Orders">
      <p>Order history, status tracking, and invoices arrive with the commerce phases.</p>
    </PhaseState>
  );
}