import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Inventory management. Stock is adjusted only through this module so that
 * every mutation is transactional and recorded as an InventoryTransaction.
 * PHASE 5 implements real stock logic with row-level locking.
 */
export const inventoryRouter = Router();

inventoryRouter.use('/admin/inventory', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.PRODUCT_MANAGER));

inventoryRouter.get('/admin/inventory', pending('list inventory'));
inventoryRouter.get('/admin/inventory/low-stock', pending('list low-stock products'));
inventoryRouter.post('/admin/inventory/:productId/adjust', pending('adjust stock'));
inventoryRouter.get('/admin/inventory/:productId/transactions', pending('product inventory transactions'));