import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Wishlist for authenticated customers.
 * PHASE 5 implements the real controllers (unique entries enforced).
 */
export const wishlistRouter = Router();

wishlistRouter.use('/wishlist', requireFirebase());

wishlistRouter.get('/wishlist', pending('get wishlist'));
wishlistRouter.post('/wishlist/items', pending('add to wishlist'));
wishlistRouter.delete('/wishlist/items/:productId', pending('remove from wishlist'));
wishlistRouter.post('/wishlist/items/:productId/move-to-cart', pending('move wishlist item to cart'));