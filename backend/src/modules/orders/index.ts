import { Router } from 'express';
import {
  AdminRole,
  requireAdminRoles,
  requireFirebase,
  requireSupabase,
} from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { checkoutLimiter } from '../../utils/rate-limit';
import * as controller from './controller';
import {
  addAdminNoteSchema,
  adminListOrdersQuerySchema,
  cancelOrderSchema,
  createOrderSchema,
  paginationQuerySchema,
  returnRequestSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from './schema';

/**
 * Orders. Creation is transactional and backend-authoritative: prices are
 * re-derived from the database, stock is reserved atomically, and the address
 * and line items are snapshotted immutably for future invoices.
 */
export const customerOrdersRouter = Router();

customerOrdersRouter.use('/orders', requireFirebase());

customerOrdersRouter.post('/orders', checkoutLimiter(), validate({ body: createOrderSchema }), controller.createOrder);
customerOrdersRouter.get('/orders', validate({ query: paginationQuerySchema }), controller.listMyOrders);
customerOrdersRouter.get('/orders/:id', controller.getMyOrder);
customerOrdersRouter.post('/orders/:id/cancel', validate({ body: cancelOrderSchema }), controller.cancelMyOrder);
customerOrdersRouter.post('/orders/:id/return-request', validate({ body: returnRequestSchema }), controller.requestReturn);
customerOrdersRouter.get('/orders/:id/invoice', controller.getMyInvoice);

export const adminOrdersRouter = Router();

adminOrdersRouter.use(
  '/admin/orders',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER),
);

adminOrdersRouter.get('/admin/orders', validate({ query: adminListOrdersQuerySchema }), controller.adminListOrders);
adminOrdersRouter.get('/admin/orders/:id', controller.adminGetOrder);
adminOrdersRouter.patch('/admin/orders/:id/status', validate({ body: updateOrderStatusSchema }), controller.adminUpdateStatus);
adminOrdersRouter.patch('/admin/orders/:id/payment-status', validate({ body: updatePaymentStatusSchema }), controller.adminUpdatePaymentStatus);
adminOrdersRouter.post('/admin/orders/:id/notes', validate({ body: addAdminNoteSchema }), controller.adminAddNote);
adminOrdersRouter.get('/admin/orders/:id/invoice', controller.adminGetInvoice);