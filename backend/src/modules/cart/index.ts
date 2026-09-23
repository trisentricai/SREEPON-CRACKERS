import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { checkoutLimiter } from '../../utils/rate-limit';
import * as controller from './controller';
import { addCartItemSchema, mergeCartSchema, updateCartItemSchema } from './schema';

/**
 * Server-side cart for authenticated customers. The backend is the single
 * source of truth for cart totals and stock availability.
 * Phase 4 implementation: get/add/update/remove/clear/merge/summary.
 */
export const cartRouter = Router();

cartRouter.use('/cart', requireFirebase());

cartRouter.get('/cart', controller.getCart);
cartRouter.post('/cart/items', checkoutLimiter(), validate({ body: addCartItemSchema }), controller.addItem);
cartRouter.patch('/cart/items/:itemId', validate({ body: updateCartItemSchema }), controller.updateItem);
cartRouter.delete('/cart/items/:itemId', controller.removeItem);
cartRouter.delete('/cart', controller.clearCart);
cartRouter.post('/cart/merge', checkoutLimiter(), validate({ body: mergeCartSchema }), controller.mergeCart);
cartRouter.get('/cart/summary', controller.summary);