import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adjustStock, listInventory, listLowStock, listProductTransactions } from './controller';
import { adjustStockSchema, listInventoryQuerySchema, transactionsQuerySchema } from './schema';

/**
 * Inventory management. Stock is adjusted only through this module so that
 * every mutation is transactional and recorded as an InventoryTransaction.
 */
export const inventoryRouter = Router();

inventoryRouter.use(
  '/admin/inventory',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.PRODUCT_MANAGER),
);

inventoryRouter.get('/admin/inventory', validate({ query: listInventoryQuerySchema }), listInventory);
inventoryRouter.get('/admin/inventory/low-stock', listLowStock);
inventoryRouter.post('/admin/inventory/:productId/adjust', validate({ body: adjustStockSchema }), adjustStock);
inventoryRouter.get('/admin/inventory/:productId/transactions', validate({ query: transactionsQuerySchema }), listProductTransactions);