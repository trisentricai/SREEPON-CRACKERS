import { useParams } from 'react-router-dom';
import { PhaseState } from './phase-state';

/** Order detail — line items, totals, and status timeline arrive with the commerce phases. */
export function OrderDetailsPage() {
  const { orderId } = useParams();
  return (
    <PhaseState title="Order Details">
      <p>
        Order <code>{orderId ?? ''}</code> details arrive with the commerce phases.
      </p>
    </PhaseState>
  );
}