import { Router } from 'express';
import { requireSupabase, requireAdminRoles, requireFirebase, AdminRole } from '../../middleware/auth.middleware';
import { checkoutLimiter } from '../../utils/rate-limit';
import { pending } from '../helpers';

/**
 * Coupons. All validity checks (expiry, min order, usage caps) run server-side.
 * PHASE 6/7 implement the real controllers.
 */
export const couponsRouter = Router();

// Customer: validate a coupon during checkout.
couponsRouter.post('/coupons/validate', requireFirebase(), checkoutLimiter(), pending('validate coupon'));

// Admin: manage coupons.
couponsRouter.use('/admin/coupons', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN));

couponsRouter.get('/admin/coupons', pending('list coupons'));
couponsRouter.post('/admin/coupons', pending('create coupon'));
couponsRouter.get('/admin/coupons/:id', pending('get coupon'));
couponsRouter.patch('/admin/coupons/:id', pending('update coupon'));
couponsRouter.delete('/admin/coupons/:id', pending('delete coupon'));