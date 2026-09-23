import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { checkoutLimiter } from '../../utils/rate-limit';
import { pending } from '../helpers';

/**
 * Server-side cart for authenticated customers. The backend is the single
 * source of truth for cart totals and stock availability.
 * PHASE 5 implements the real controllers (incl. guest-cart merge).
 */
export const cartRouter = Router();

cartRouter.use('/cart', requireFirebase());

cartRouter.get('/cart', pending('get cart'));
cartRouter.post('/cart/items', checkoutLimiter(), pending('add item to cart'));
cartRouter.patch('/cart/items/:itemId', pending('update cart item quantity'));
cartRouter.delete('/cart/items/:itemId', pending('remove cart item'));
cartRouter.delete('/cart', pending('clear cart'));
cartRouter.post('/cart/merge', pending('merge guest cart'));
cartRouter.get('/cart/summary', pending('get cart summary with pricing'));