import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Customer shipping addresses.
 * PHASE 6 implements the real controllers.
 */
export const addressesRouter = Router();

addressesRouter.use('/addresses', requireFirebase());

addressesRouter.get('/addresses', pending('list addresses'));
addressesRouter.post('/addresses', pending('create address'));
addressesRouter.get('/addresses/:id', pending('get address'));
addressesRouter.patch('/addresses/:id', pending('update address'));
addressesRouter.delete('/addresses/:id', pending('delete address'));
addressesRouter.patch('/addresses/:id/default', pending('set default address'));