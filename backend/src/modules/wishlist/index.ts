import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import * as controller from './controller';
import { addWishlistItemSchema } from './schema';

/**
 * Wishlist for authenticated customers.
 * Phase 4 implementation: list / add (unique) / remove / move-to-cart.
 */
export const wishlistRouter = Router();

wishlistRouter.use('/wishlist', requireFirebase());

wishlistRouter.get('/wishlist', controller.getWishlist);
wishlistRouter.post('/wishlist/items', validate({ body: addWishlistItemSchema }), controller.addItem);
wishlistRouter.delete('/wishlist/items/:productId', controller.removeItem);
wishlistRouter.post('/wishlist/items/:productId/move-to-cart', controller.moveToCart);