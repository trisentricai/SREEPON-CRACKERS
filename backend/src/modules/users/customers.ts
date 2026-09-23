import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Customer management (admin view). Read-only operational visibility — never
 * exposes authentication credentials.
 * PHASE 6+ implements the real controllers.
 */
export const adminCustomersRouter = Router();

adminCustomersRouter.use('/admin/customers', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER));

adminCustomersRouter.get('/admin/customers', pending('list customers'));
adminCustomersRouter.get('/admin/customers/:id', pending('get customer'));
adminCustomersRouter.get('/admin/customers/:id/orders', pending('get customer orders'));