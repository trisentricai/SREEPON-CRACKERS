import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Customer management (admin CRM). Supabase-guarded, restricted to
 * SUPER_ADMIN / ADMIN / ORDER_MANAGER. Phase 8 mounts the guarded routes;
 * controllers land in the next phase.
 */
export const adminCustomersRouter = Router();

adminCustomersRouter.use(
  '/admin/customers',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER),
);

adminCustomersRouter.get('/admin/customers', pending('list customers'));
adminCustomersRouter.get('/admin/customers/:id', pending('get customer'));
adminCustomersRouter.get('/admin/customers/:id/orders', pending('get customer orders'));
