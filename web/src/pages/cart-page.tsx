import { PhaseState } from './phase-state';

/** Shopping cart — persistent cart, pricing, and merge arrive with the cart phase. */
export function CartPage() {
  return (
    <PhaseState title="Shopping Cart">
      <p>
        Cart persistence, guest cart merge, and coupon-friendly pricing arrive with the commerce phases.
      </p>
    </PhaseState>
  );
}