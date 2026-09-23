import { PhaseState } from './phase-state';

/** Wishlist — saved items arrive with the shopping phase. */
export function WishlistPage() {
  return (
    <PhaseState title="Wishlist">
      <p>Saving items and moving them to the cart arrive with the shopping phases.</p>
    </PhaseState>
  );
}