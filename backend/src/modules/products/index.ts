import { Router } from 'express';
import { requireAdminRoles, requireSupabase, AdminRole } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Product management (admin) and catalog browsing (public).
 * PHASE 4 implements the real controllers: CRUD, images via Cloudinary,
 * listing/search/filter/sort for the storefront.
 */
export const productsRouter = Router();

// Public catalog
productsRouter.get('/products', pending('list products'));
productsRouter.get('/products/search', pending('search products'));
productsRouter.get('/products/slug/:slug', pending('get product by slug'));
productsRouter.get('/products/:id', pending('get product by id'));

// Admin management
productsRouter.use('/admin/products', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.PRODUCT_MANAGER));

productsRouter.post('/admin/products', pending('create product'));
productsRouter.patch('/admin/products/:id', pending('update product'));
productsRouter.delete('/admin/products/:id', pending('delete product'));
productsRouter.patch('/admin/products/:id/visibility', pending('activate/deactivate product'));
productsRouter.post('/admin/products/:id/images', pending('add product image'));
productsRouter.patch('/admin/products/:id/images/:imageId', pending('update product image'));
productsRouter.delete('/admin/products/:id/images/:imageId', pending('delete product image'));
productsRouter.patch('/admin/products/:id/images/reorder', pending('reorder product images'));