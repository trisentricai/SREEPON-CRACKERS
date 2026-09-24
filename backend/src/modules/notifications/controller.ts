import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, ok, routeParam } from '../../utils/http';
import { getProfileByUid } from '../auth/service';
import type { ListNotificationsQuery, RegisterDeviceInput } from './schema';
import * as service from './service';

function resolveUserId(req: Request): Promise<string> {
  return getProfileByUid(req.user!.uid).then((user) => user.id);
}

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<ListNotificationsQuery>(req);
  const result = await service.listNotifications(await resolveUserId(req), query);
  res.json(ok(result, `${result.pagination.total} notification(s)`));
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await service.markOneRead(await resolveUserId(req), routeParam(req, 'id'));
  res.json(ok(notification, 'Notification marked as read'));
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.markAllRead(await resolveUserId(req));
  res.json(ok(result, `${result.marked} notification(s) marked as read`));
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.unreadCount(await resolveUserId(req));
  res.json(ok(result));
});

export const registerDevice = asyncHandler(async (req: Request, res: Response) => {
  await service.registerDeviceToken(await resolveUserId(req), req.body as RegisterDeviceInput);
  res.json(ok(null, 'Device registered for notifications'));
});

export const unregisterDevice = asyncHandler(async (req: Request, res: Response) => {
  await service.unregisterDeviceToken(await resolveUserId(req), routeParam(req, 'token'));
  res.json(ok(null, 'Device unregistered'));
});