import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Read-only analytics for the admin dashboard. Every metric is computed from
 * real order/inventory/user data. PHASE 13 implements the real controllers.
 */
export const analyticsRouter = Router();

analyticsRouter.use(
    '/admin/analytics',
    requireSupabase(),
    requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ANALYST),
  );

analyticsRouter.get('/admin/analytics/dashboard', pending('dashboard metrics'));
analyticsRouter.get('/admin/analytics/revenue', pending('revenue over time'));
analyticsRouter.get('/admin/analytics/orders', pending('orders over time'));
analyticsRouter.get('/admin/analytics/top-products', pending('top products'));
analyticsRouter.get('/admin/analytics/categories', pending('category performance'));