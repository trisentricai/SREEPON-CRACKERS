import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, ok, routeParam } from '../../utils/http';
import type { ListNotificationsQuery, RegisterDeviceInput } from './schema';
import * as service from './admin.service';

export const listAdminNotifications = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<ListNotificationsQuery>(req);
  const adminId = await service.resolveAdminId(req);
  const result = await service.listAdminNotifications(adminId, query);
  res.json(ok(result, `${result.pagination.total} notification(s)`));
});

export const markAdminNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const adminId = await service.resolveAdminId(req);
  const notification = await service.markAdminNotificationRead(adminId, routeParam(req, 'id'));
  res.json(ok(notification, 'Notification marked as read'));
});

export const markAllAdminNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const adminId = await service.resolveAdminId(req);
  const result = await service.markAllAdminNotificationsRead(adminId);
  res.json(ok(result, `${result.marked} notification(s) marked as read`));
});

export const getUnreadAdminNotificationCount = asyncHandler(async (req: Request, res: Response) => {
  const adminId = await service.resolveAdminId(req);
  const result = await service.unreadAdminNotificationCount(adminId);
  res.json(ok(result));
});

export const registerAdminDevice = asyncHandler(async (req: Request, res: Response) => {
  const adminId = await service.resolveAdminId(req);
  await service.registerAdminDeviceToken(adminId, req.body as RegisterDeviceInput);
  res.json(ok(null, 'Device registered for notifications'));
});

export const unregisterAdminDevice = asyncHandler(async (req: Request, res: Response) => {
  const adminId = await service.resolveAdminId(req);
  await service.unregisterAdminDeviceToken(adminId, routeParam(req, 'token'));
  res.json(ok(null, 'Device unregistered'));
});

export const createAdminNotification = asyncHandler(async (req: Request, res: Response) => {
  const adminId = await service.resolveAdminId(req);
  const { type, title, body, data } = req.body as {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };
  const notification = await service.createAdminNotification({ adminId, type: type as any, title, body, data });
  res.status(201).json(ok(notification, 'Notification created'));
});
