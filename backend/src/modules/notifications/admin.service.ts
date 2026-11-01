import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { ApiError } from '../../utils/http';
import type { NotificationType } from '../../types/enums';
import type { ListNotificationsQuery, RegisterDeviceInput } from './schema';

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  data: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} as const;

/** Resolve the internal Admin.id from the Supabase uid carried on req.admin. */
export async function resolveAdminId(req: { admin?: { sub?: string } }): Promise<string> {
  const sub = req.admin?.sub;
  if (!sub) throw ApiError.unauthorized('Admin authentication required');
  const admin = await prisma.admin.findUnique({ where: { supabaseUid: sub }, select: { id: true } });
  if (!admin) throw ApiError.notFound('Admin account not found');
  return admin.id;
}

export async function listAdminNotifications(adminId: string, query: ListNotificationsQuery) {
  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where: { adminId } }),
    prisma.notification.findMany({
      where: { adminId },
      select: notificationSelect,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return {
    items: notifications,
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  };
}

export async function markAdminNotificationRead(adminId: string, id: string) {
  const notification = await prisma.notification.findFirst({ where: { id, adminId }, select: { id: true, isRead: true } });
  if (!notification) throw ApiError.notFound('Notification not found');

  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }
  return prisma.notification.findUniqueOrThrow({ where: { id }, select: notificationSelect });
}

export async function markAllAdminNotificationsRead(adminId: string) {
  const result = await prisma.notification.updateMany({
    where: { adminId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { marked: result.count };
}

export async function unreadAdminNotificationCount(adminId: string) {
  const count = await prisma.notification.count({ where: { adminId, isRead: false } });
  return { count };
}

export async function registerAdminDeviceToken(adminId: string, input: RegisterDeviceInput) {
  return prisma.deviceToken.upsert({
    where: { adminId_token: { adminId, token: input.token } },
    update: { platform: input.platform ?? null },
    create: { adminId, token: input.token, platform: input.platform ?? null },
  });
}

export async function unregisterAdminDeviceToken(adminId: string, token: string) {
  await prisma.deviceToken.deleteMany({ where: { adminId, token } });
}

/** Create an in-app notification for an admin (used by order/payment/inventory events). */
export async function createAdminNotification({
  adminId,
  type,
  title,
  body,
  data,
}: {
  adminId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: { adminId, type, title, body, data: data == null ? { null: true } : (data as unknown as Prisma.InputJsonValue) },
    select: notificationSelect,
  });
}

/** Fetch all device tokens for a given admin (for FCM broadcast). */
export async function getAdminDeviceTokens(adminId: string) {
  const tokens = await prisma.deviceToken.findMany({
    where: { adminId },
    select: { token: true },
  });
  return tokens.map((t) => t.token);
}
