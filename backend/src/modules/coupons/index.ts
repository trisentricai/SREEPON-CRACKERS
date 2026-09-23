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
  adminListCouponsQuerySchema,
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} from './schema';

/**
 * Coupons. All validity checks (expiry, minimum order value, usage and per-user
 * caps) run server-side against the redemption ledger.
 */
export const couponsRouter = Router();

// Customer: validate a coupon during checkout.
couponsRouter.post(
  '/coupons/validate',
  requireFirebase(),
  checkoutLimiter(),
  validate({ body: validateCouponSchema }),
  controller.validateCoupon,
);

// Admin: manage coupons.
couponsRouter.use('/admin/coupons', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN));

couponsRouter.get('/admin/coupons', validate({ query: adminListCouponsQuerySchema }), controller.listCoupons);
couponsRouter.post('/admin/coupons', validate({ body: createCouponSchema }), controller.createCoupon);
couponsRouter.get('/admin/coupons/:id', controller.getCoupon);
couponsRouter.patch('/admin/coupons/:id', validate({ body: updateCouponSchema }), controller.updateCoupon);
couponsRouter.delete('/admin/coupons/:id', controller.deleteCoupon);