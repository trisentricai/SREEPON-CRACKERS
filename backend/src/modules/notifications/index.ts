import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerDevice,
  unregisterDevice,
} from './controller';
import { listNotificationsQuerySchema, registerDeviceSchema } from './schema';

/**
 * Customer notifications (FCM-backed storage). Push delivery subscribes to
 * registered device tokens; this phase owns the inbox and device registry.
 */
export const notificationsRouter = Router();

notificationsRouter.use('/notifications', requireFirebase());

notificationsRouter.get('/notifications', validate({ query: listNotificationsQuerySchema }), listNotifications);
notificationsRouter.get('/notifications/unread-count', getUnreadCount);
notificationsRouter.patch('/notifications/read-all', markAllNotificationsRead);
notificationsRouter.patch('/notifications/:id/read', markNotificationRead);
notificationsRouter.post('/notifications/devices', validate({ body: registerDeviceSchema }), registerDevice);
notificationsRouter.delete('/notifications/devices/:token', unregisterDevice);