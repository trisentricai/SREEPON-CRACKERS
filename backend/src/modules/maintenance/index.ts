import { Router } from 'express';
import { AdminRole, requireAdminRoles, requireSupabase } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import * as controller from './controller';
import { expireOrdersSchema } from './schema';

/**
 * Operational maintenance.
 *
 * The heavy lifting runs on a schedule (Cloudflare Cron Trigger →
 * `scheduled` in backend/worker.mjs → `runScheduledMaintenance`). The HTTP
 * route below exposes the same idempotent job to the admin dashboard so it can
 * be run on demand and its result inspected.
 */
export const maintenanceRouter = Router();

maintenanceRouter.use(
  '/admin/maintenance',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN),
);

maintenanceRouter.post(
  '/admin/maintenance/expire-orders',
  validate({ body: expireOrdersSchema }),
  controller.expireOrders,
);
