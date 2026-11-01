import { Router } from 'express';
import { requireAdminRoles, requireFirebase, requireSupabase, AdminRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerDevice,
  unregisterDevice,
} from './controller';
import {
  createAdminNotification,
  getUnreadAdminNotificationCount,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  registerAdminDevice,
  unregisterAdminDevice,
} from './admin.controller';
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

/** Admin notifications (Supabase-authenticated). */
notificationsRouter.get(
  '/admin/notifications',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER),
  validate({ query: listNotificationsQuerySchema }),
  listAdminNotifications,
);
notificationsRouter.get(
  '/admin/notifications/unread-count',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER),
  getUnreadAdminNotificationCount,
);
notificationsRouter.patch(
  '/admin/notifications/read-all',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER),
  markAllAdminNotificationsRead,
);
notificationsRouter.patch(
  '/admin/notifications/:id/read',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER),
  markAdminNotificationRead,
);
notificationsRouter.post(
  '/admin/notifications/devices',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER),
  validate({ body: registerDeviceSchema }),
  registerAdminDevice,
);
notificationsRouter.delete(
  '/admin/notifications/devices/:token',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER),
  unregisterAdminDevice,
);