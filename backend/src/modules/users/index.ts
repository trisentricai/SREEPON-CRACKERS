import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { pending } from '../helpers';
import { paginationQuerySchema } from '../orders/schema';
import { getMyOrderHistory, getMyProfile, updateMyProfile } from './controller';
import { updateProfileSchema } from './schema';

/**
 * Customer profile management. Restricted to authenticated customers.
 * Avatar upload ships with the media (Cloudinary) phase — storing one needs a
 * User.avatarUrl column and a signed-upload endpoint, neither of which exists yet.
 */
export const usersRouter = Router();

usersRouter.use('/users', requireFirebase());

usersRouter.get('/users/me', getMyProfile);
usersRouter.patch('/users/me', validate({ body: updateProfileSchema }), updateMyProfile);
usersRouter.post('/users/me/avatar', pending('update avatar'));
usersRouter.get('/users/me/orders', validate({ query: paginationQuerySchema }), getMyOrderHistory);