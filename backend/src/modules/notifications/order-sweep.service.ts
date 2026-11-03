import { prisma } from '../../infrastructure/prisma';
import { NotificationType, OrderStatus } from '../../types/enums';
import { logger } from '../../utils/logger';
import { createAdminNotification } from './admin.service';
import { sendAdminPush } from './push.service';

/**
 * New-order sweep.
 *
 * `POST /orders` already notifies every active admin (in-app row + FCM push)
 * the moment an order is placed. This job is the safety net: it scans recent
 * orders, finds any that are missing an admin `ORDER_CONFIRMED` notification
 * (because the request died between the order commit and the notification, the
 * admin list was empty at the time, etc.) and creates + pushes it.
 *
 * It is idempotent: dedupe is a `${adminId}:${orderNumber}` key read back from
 * the notification's JSON `data`, so a cron retry or a manual run never
 * double-notifies. It is invoked by the `*\/2 * * * *` Cron Trigger and by
 * `POST /admin/notifications/sweep-orders`.
 */

/** How far back each run looks for orders that never notified admins. */
export const DEFAULT_SWEEP_LOOKBACK_MINUTES = 60;

/**
 * Hard ceiling on one run so a cron invocation stays well inside the Worker's
 * CPU/query budget. The job runs every 2 minutes, so a backlog drains quickly.
 */
export const MAX_SWEEP_BATCH_SIZE = 100;

/**
 * Only orders newer than this get a push. Older than this (a backlog on the
 * first deploy, or a long outage) still gets the in-app row so the admin inbox
 * is complete, but nobody's phone buzzes for an order from an hour ago.
 */
export const MAX_PUSH_AGE_MINUTES = 10;

export interface SweepNewOrdersOptions {
  /** Only orders created within this many minutes are considered. */
  lookbackMinutes?: number;
  /** Maximum orders handled in this run (capped by MAX_SWEEP_BATCH_SIZE). */
  limit?: number;
}

export interface SweepNewOrdersResult {
  lookbackMinutes: number;
  cutoff: string;
  admins: number;
  scanned: number;
  /** Orders that were missing at least one admin notification. */
  missing: number;
  /** Admin notifications created by this run. */
  created: number;
  /** Orders that already had a notification for every active admin. */
  skipped: number;
  /** Orders where every notification insert failed. */
  failed: number;
  /** Push messages accepted by FCM. */
  pushed: number;
  orderNumbers: string[];
  failedOrderNumbers: string[];
}

/** Read `data.orderNumber` from a notification row without trusting its shape. */
function orderNumberFromData(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>).orderNumber;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function sweepNewOrders(
  options: SweepNewOrdersOptions = {},
): Promise<SweepNewOrdersResult> {
  const lookbackMinutes = options.lookbackMinutes ?? DEFAULT_SWEEP_LOOKBACK_MINUTES;
  const limit = Math.min(options.limit ?? MAX_SWEEP_BATCH_SIZE, MAX_SWEEP_BATCH_SIZE);
  const cutoff = new Date(Date.now() - lookbackMinutes * 60_000);

  const result: SweepNewOrdersResult = {
    lookbackMinutes,
    cutoff: cutoff.toISOString(),
    admins: 0,
    scanned: 0,
    missing: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    pushed: 0,
    orderNumbers: [],
    failedOrderNumbers: [],
  };

  const admins = await prisma.admin.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  result.admins = admins.length;
  if (admins.length === 0) return result;

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: cutoff },
      // A cancelled order (usually the expiry job) no longer needs attention.
      status: { not: OrderStatus.CANCELLED },
    },
    select: {
      id: true,
      orderNumber: true,
      grandTotal: true,
      currency: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  result.scanned = orders.length;
  if (orders.length === 0) return result;

  const adminIds = admins.map((admin) => admin.id);

  // One read for the whole batch: every admin order notification inside the
  // window. Notifications are always written after the order row, so anything
  // older than the cutoff cannot belong to an order inside it.
  const existing = await prisma.notification.findMany({
    where: {
      adminId: { in: adminIds },
      type: NotificationType.ORDER_CONFIRMED,
      createdAt: { gte: cutoff },
    },
    select: { adminId: true, data: true },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const alreadyNotified = new Set<string>();
  for (const notification of existing) {
    const orderNumber = orderNumberFromData(notification.data);
    if (notification.adminId && orderNumber) {
      alreadyNotified.add(`${notification.adminId}:${orderNumber}`);
    }
  }

  // One read for the whole batch too: device tokens grouped by admin, so a
  // push only goes to admins whose in-app row this run actually created.
  const devices = await prisma.deviceToken.findMany({
    where: { adminId: { in: adminIds } },
    select: { adminId: true, token: true },
  });
  const tokensByAdmin = new Map<string, string[]>();
  for (const device of devices) {
    if (!device.adminId) continue;
    const tokens = tokensByAdmin.get(device.adminId) ?? [];
    tokens.push(device.token);
    tokensByAdmin.set(device.adminId, tokens);
  }

  const pushableCutoff = Date.now() - MAX_PUSH_AGE_MINUTES * 60_000;

  for (const order of orders) {
    const title = `New Order #${order.orderNumber}`;
    const body = `${order.user?.name ?? 'Customer'} placed a new order for ${order.currency} ${order.grandTotal}`;

    const missingAdmins = admins.filter(
      (admin) => !alreadyNotified.has(`${admin.id}:${order.orderNumber}`),
    );
    if (missingAdmins.length === 0) {
      result.skipped += 1;
      continue;
    }

    result.missing += 1;
    const notifiedAdmins: string[] = [];

    for (const admin of missingAdmins) {
      try {
        await createAdminNotification({
          adminId: admin.id,
          type: NotificationType.ORDER_CONFIRMED,
          title,
          body,
          data: { orderNumber: order.orderNumber, type: NotificationType.ORDER_CONFIRMED },
        });
        alreadyNotified.add(`${admin.id}:${order.orderNumber}`);
        notifiedAdmins.push(admin.id);
        result.created += 1;
      } catch (err) {
        logger.error(
          { err, orderId: order.id, orderNumber: order.orderNumber, adminId: admin.id },
          'order sweep notification insert failed',
        );
      }
    }

    if (notifiedAdmins.length === 0) {
      result.failed += 1;
      result.failedOrderNumbers.push(order.orderNumber);
      continue;
    }

    result.orderNumbers.push(order.orderNumber);

    if (order.createdAt.getTime() < pushableCutoff) continue;

    const tokens = notifiedAdmins.flatMap((adminId) => tokensByAdmin.get(adminId) ?? []);
    if (tokens.length === 0) continue;

    try {
      result.pushed += await sendAdminPush(tokens, {
        title,
        body,
        data: { route: `/orders/${order.id}`, orderNumber: order.orderNumber },
      });
    } catch (err) {
      logger.warn({ err, orderId: order.id, orderNumber: order.orderNumber }, 'order sweep push failed');
    }
  }

  return result;
}

/**
 * Entry point for the cron trigger. Throws on database failure so the platform
 * records the run as failed instead of silently doing nothing.
 */
export async function runOrderSweep(cron: string): Promise<SweepNewOrdersResult> {
  const startedAt = Date.now();
  try {
    const result = await sweepNewOrders();
    logger.info({ cron, durationMs: Date.now() - startedAt, ...result }, 'order sweep finished');
    return result;
  } catch (err) {
    logger.error({ err, cron, durationMs: Date.now() - startedAt }, 'order sweep failed');
    throw err;
  }
}
