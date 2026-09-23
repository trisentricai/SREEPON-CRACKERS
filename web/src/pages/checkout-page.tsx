import { PhaseState } from './phase-state';

/** Checkout — addresses, payment, and idempotent order creation arrive with the commerce phases. */
export function CheckoutPage() {
  return (
    <PhaseState title="Checkout">
      <p>Address, delivery, payment, and idempotency (X-Idempotency-Key) flows arrive with the commerce phases.</p>
    </PhaseState>
  );
}