import { Router } from 'express';
import {
  requireAdminRoles,
  requireSupabase,
  AdminRole,
} from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import * as controller from './controller';
import { createCategorySchema, listCategoriesQuerySchema, reorderCategoriesSchema, updateCategorySchema } from './schema';

/**
 * Nested (parent/child) category management.
 * Public routes expose the live navigation tree; admin routes manage it.
 */
export const categoriesRouter = Router();

// Public
categoriesRouter.get('/categories', validate({ query: listCategoriesQuerySchema }), controller.listCategories);
categoriesRouter.get('/categories/tree', controller.getCategoryTree);
categoriesRouter.get('/categories/:slug', controller.getCategoryBySlug);

// Admin
categoriesRouter.use(
  '/admin/categories',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.PRODUCT_MANAGER),
);

categoriesRouter.get('/admin/categories', validate({ query: listCategoriesQuerySchema }), controller.listAdminCategories);
categoriesRouter.post('/admin/categories', validate({ body: createCategorySchema }), controller.createCategory);
categoriesRouter.patch(
  '/admin/categories/:id',
  validate({ body: updateCategorySchema }),
  controller.updateCategory,
);
categoriesRouter.delete('/admin/categories/:id', controller.deleteCategory);
categoriesRouter.patch(
  '/admin/categories/reorder',
  validate({ body: reorderCategoriesSchema }),
  controller.reorderCategories,
);