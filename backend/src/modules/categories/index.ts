import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Category management with nested (parent/child) categories.
 * PHASE 4 implements the real controllers.
 */
export const categoriesRouter = Router();

// Public
categoriesRouter.get('/categories', pending('list categories'));
categoriesRouter.get('/categories/tree', pending('category tree'));
categoriesRouter.get('/categories/:slug', pending('get category by slug'));

// Admin
categoriesRouter.use('/admin/categories', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.PRODUCT_MANAGER));

categoriesRouter.post('/admin/categories', pending('create category'));
categoriesRouter.patch('/admin/categories/:id', pending('update category'));
categoriesRouter.delete('/admin/categories/:id', pending('delete category'));
categoriesRouter.patch('/admin/categories/reorder', pending('reorder categories'));