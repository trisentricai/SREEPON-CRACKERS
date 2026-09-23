import { PhaseState } from './phase-state';

/** Product detail — specs, highlights, images, and add-to-cart arrive with the catalog phase. */
export function ProductDetailsPage() {
  return (
    <PhaseState title="Product Details">
      <p>
        Product images (Cloudinary), pricing, specifications, and add-to-cart controls arrive with the catalog phase.
      </p>
    </PhaseState>
  );
}