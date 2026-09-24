import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { getCategoryPerformance, getDashboard, getOrdersOverTime, getRevenueOverTime, getTopProducts } from './controller';
import { analyticsQuerySchema, categoriesQuerySchema, topProductsQuerySchema } from './schema';

/**
 * Read-only analytics for the admin dashboard. Every metric is computed from
 * real order/inventory/user data.
 */
export const analyticsRouter = Router();

analyticsRouter.use(
  '/admin/analytics',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ANALYST),
);

analyticsRouter.get('/admin/analytics/dashboard', getDashboard);
analyticsRouter.get('/admin/analytics/revenue', validate({ query: analyticsQuerySchema }), getRevenueOverTime);
analyticsRouter.get('/admin/analytics/orders', validate({ query: analyticsQuerySchema }), getOrdersOverTime);
analyticsRouter.get('/admin/analytics/top-products', validate({ query: topProductsQuerySchema }), getTopProducts);
analyticsRouter.get('/admin/analytics/categories', validate({ query: categoriesQuerySchema }), getCategoryPerformance);