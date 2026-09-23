import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Customer notifications (FCM-backed).
 * PHASE 12 implements the real controllers and push delivery workers.
 */
export const notificationsRouter = Router();

notificationsRouter.use('/notifications', requireFirebase());

notificationsRouter.get('/notifications', pending('list my notifications'));
notificationsRouter.patch('/notifications/:id/read', pending('mark notification read'));
notificationsRouter.patch('/notifications/read-all', pending('mark all read'));
notificationsRouter.get('/notifications/unread-count', pending('unread count'));
notificationsRouter.post('/notifications/devices', pending('register FCM device token'));
notificationsRouter.delete('/notifications/devices/:token', pending('unregister FCM device token'));