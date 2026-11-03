import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, ok, routeParam } from '../../utils/http';
import type { ListNotificationsQuery, RegisterDeviceInput, SweepOrdersInput } from './schema';
import * as service from './admin.service';
import { sweepNewOrders } from './order-sweep.service';

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

/**
 * Run the new-order sweep now (same idempotent job as the 2-minute cron).
 * Handy to verify the cron wiring without waiting, or to backfill notifications
 * after an outage.
 */
export const sweepOrders = asyncHandler(async (req: Request, res: Response) => {
  const input = (req.body ?? {}) as SweepOrdersInput;
  const result = await sweepNewOrders(input);
  res.json(
    ok(
      result,
      result.created > 0
        ? `Created ${result.created} admin notification(s) for ${result.orderNumbers.length} order(s)`
        : 'No orders are missing admin notifications',
    ),
  );
});
