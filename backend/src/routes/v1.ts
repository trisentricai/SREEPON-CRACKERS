import { Router } from 'express';
import { adminsRouter } from '../modules/admins';
import { authRouter } from '../modules/auth';
import { usersRouter } from '../modules/users';
import { adminCustomersRouter } from '../modules/users/customers';
import { productsRouter } from '../modules/products';
import { categoriesRouter } from '../modules/categories';
import { inventoryRouter } from '../modules/inventory';
import { cartRouter } from '../modules/cart';
import { wishlistRouter } from '../modules/wishlist';
import { addressesRouter } from '../modules/addresses';
import { customerOrdersRouter, adminOrdersRouter } from '../modules/orders';
import { paymentsRouter } from '../modules/payments';
import { couponsRouter } from '../modules/coupons';
import { bannersRouter } from '../modules/banners';
import { homepageRouter } from '../modules/homepage';
import { notificationsRouter } from '../modules/notifications';
import { analyticsRouter } from '../modules/analytics';
import { settingsRouter } from '../modules/settings';
import { mediaRouter } from '../modules/media';

/**
 * API v1 route table.
 * Mount order matters: admin routers are separate from public routers so
 * middleware scoping stays explicit.
 */
export const v1Router = Router();

// Public / identity
v1Router.use(authRouter);
v1Router.use(adminsRouter);
v1Router.use(usersRouter);
v1Router.use(adminCustomersRouter);

// Catalog
v1Router.use(productsRouter);
v1Router.use(categoriesRouter);

// Customer operations
v1Router.use(cartRouter);
v1Router.use(wishlistRouter);
v1Router.use(addressesRouter);

// Commerce
v1Router.use(customerOrdersRouter);
v1Router.use(adminOrdersRouter);
v1Router.use(paymentsRouter);
v1Router.use(couponsRouter);

// Content
v1Router.use(bannersRouter);
v1Router.use(homepageRouter);

// Engagement
v1Router.use(notificationsRouter);

// Ops
v1Router.use(analyticsRouter);
v1Router.use(settingsRouter);
v1Router.use(inventoryRouter);

// Media
v1Router.use(mediaRouter);

// Guest cart merge (requires auth) and misc
v1Router.get('/ping', (_req, res) => {
  res.json({ success: true, data: { message: 'pong' } });
});