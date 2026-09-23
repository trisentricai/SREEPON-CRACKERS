import { Router } from 'express';
import { requireAdminRoles, requireFirebase, requireSupabase, AdminRole } from '../../middleware/auth.middleware';
import { checkoutLimiter } from '../../utils/rate-limit';
import { pending } from '../helpers';

/**
 * Orders. Order creation is transactional and re-derives every price from the
 * database (PHASE 6). Admin operations with full status timeline (PHASE 6).
 */
export const customerOrdersRouter = Router();

customerOrdersRouter.use('/orders', requireFirebase());

customerOrdersRouter.post('/orders', checkoutLimiter(), pending('create order'));
customerOrdersRouter.get('/orders', pending('list my orders'));
customerOrdersRouter.get('/orders/:id', pending('get my order'));
customerOrdersRouter.post('/orders/:id/cancel', pending('cancel order'));
customerOrdersRouter.post('/orders/:id/return-request', pending('request return'));
customerOrdersRouter.get('/orders/:id/invoice', pending('get order invoice'));

export const adminOrdersRouter = Router();

adminOrdersRouter.use('/admin/orders', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER));

adminOrdersRouter.get('/admin/orders', pending('list all orders'));
adminOrdersRouter.get('/admin/orders/:id', pending('get order details'));
adminOrdersRouter.patch('/admin/orders/:id/status', pending('update order status'));
adminOrdersRouter.patch('/admin/orders/:id/payment-status', pending('update payment status'));
adminOrdersRouter.post('/admin/orders/:id/notes', pending('add order note'));
adminOrdersRouter.get('/admin/orders/:id/invoice', pending('get invoice for printing'));