import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Customer profile management. Restricted to authenticated customers.
 * PHASE 5 implements the real controllers.
 */
export const usersRouter = Router();

usersRouter.use('/users', requireFirebase());

usersRouter.get('/users/me', pending('get own profile'));
usersRouter.patch('/users/me', pending('update own profile'));
usersRouter.post('/users/me/avatar', pending('update avatar'));
usersRouter.get('/users/me/orders', pending('get own orders'));