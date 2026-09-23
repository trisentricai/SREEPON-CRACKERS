import { Router } from 'express';
import {
  requireAdminRoles,
  requireSupabase,
  AdminRole,
} from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import * as controller from './controller';
import {
  adminProductQuerySchema,
  createProductImageSchema,
  createProductSchema,
  productQuerySchema,
  reorderProductImagesSchema,
  searchProductsQuerySchema,
  setProductVisibilitySchema,
  updateProductImageSchema,
  updateProductSchema,
} from './schema';

/**
 * Product catalog (public storefront) and management (admin dashboard).
 * Phase 2 implementation: CRUD, listing/search/filter/sort, image metadata.
 */
export const productsRouter = Router();

// Public catalog
productsRouter.get('/products', validate({ query: productQuerySchema }), controller.listProducts);
productsRouter.get('/products/search', validate({ query: searchProductsQuerySchema }), controller.searchProducts);
productsRouter.get('/products/slug/:slug', controller.getProductBySlug);
productsRouter.get('/products/:id', controller.getProductById);

// Admin management
productsRouter.use(
  '/admin/products',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.PRODUCT_MANAGER),
);

productsRouter.get('/admin/products', validate({ query: adminProductQuerySchema }), controller.adminListProducts);
productsRouter.post('/admin/products', validate({ body: createProductSchema }), controller.createProduct);
productsRouter.patch('/admin/products/:id', validate({ body: updateProductSchema }), controller.updateProduct);
productsRouter.delete('/admin/products/:id', controller.deleteProduct);
productsRouter.patch(
  '/admin/products/:id/visibility',
  validate({ body: setProductVisibilitySchema }),
  controller.setProductVisibility,
);
productsRouter.post(
  '/admin/products/:id/images',
  validate({ body: createProductImageSchema }),
  controller.addProductImage,
);
productsRouter.patch(
  '/admin/products/:id/images/:imageId',
  validate({ body: updateProductImageSchema }),
  controller.updateProductImage,
);
productsRouter.delete('/admin/products/:id/images/:imageId', controller.deleteProductImage);
productsRouter.patch(
  '/admin/products/:id/images/reorder',
  validate({ body: reorderProductImagesSchema }),
  controller.reorderProductImages,
);