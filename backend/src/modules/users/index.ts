import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { paginationQuerySchema } from '../orders/schema';
import { getMyOrderHistory, getMyProfile, updateMyProfile } from './controller';
import { updateProfileSchema } from './schema';

/**
 * Customer profile management. Restricted to authenticated customers.
 * Avatar upload lives in the media module (`POST /users/me/avatar`).
 */
export const usersRouter = Router();

usersRouter.use('/users', requireFirebase());

usersRouter.get('/users/me', getMyProfile);
usersRouter.patch('/users/me', validate({ body: updateProfileSchema }), updateMyProfile);
usersRouter.get('/users/me/orders', validate({ query: paginationQuerySchema }), getMyOrderHistory);