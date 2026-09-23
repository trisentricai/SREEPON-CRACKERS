import { PhaseState } from './phase-state';

/** Category / product listing — grid, filters, and sorting arrive with the catalog phase. */
export function ProductsPage() {
  return (
    <PhaseState title="Shop Crackers & Fireworks">
      <p>
        Product listings, category browsing, search, and filters come online with the catalog phase. The routing
        (<code>/products</code>, <code>/products/:categorySlug</code>) is wired now.
      </p>
    </PhaseState>
  );
}