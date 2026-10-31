import type { Request, Response } from 'express';
import { asyncHandler, ok } from '../../utils/http';
import * as service from './service';

/**
 * Run the order-expiry job now and report what it did. Handy after a bulk
 * import, when reconciling stock, or to verify the cron wiring without waiting
 * for the next trigger.
 */
export const expireOrders = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.expireStaleOrders(req.body);
  res.json(
    ok(
      result,
      result.cancelled > 0
        ? `Cancelled ${result.cancelled} stale order(s) and released ${result.reservationsReleased} reserved unit(s)`
        : 'No stale orders to cancel',
    ),
  );
});
