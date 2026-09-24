import { prisma } from '../../infrastructure/prisma';
import { ApiError } from '../../utils/http';
import type { ListNotificationsQuery, RegisterDeviceInput } from './schema';

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  data: true,
  isRead: true,
  createdAt: true,
} as const;

export async function listNotifications(userId: string, query: ListNotificationsQuery) {
  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.findMany({
      where: { userId },
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

export async function markOneRead(userId: string, id: string) {
  const notification = await prisma.notification.findFirst({ where: { id, userId }, select: { id: true, isRead: true } });
  if (!notification) throw ApiError.notFound('Notification not found');

  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }
  return prisma.notification.findUniqueOrThrow({ where: { id }, select: notificationSelect });
}

/** Marks every unread row as read; returns the number newly marked. */
export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { marked: result.count };
}

export async function unreadCount(userId: string) {
  const count = await prisma.notification.count({ where: { userId, isRead: false } });
  return { count };
}

/** Register a device for push delivery. Duplicate tokens are idempotent. */
export async function registerDeviceToken(userId: string, input: RegisterDeviceInput) {
  return prisma.deviceToken.upsert({
    where: { userId_token: { userId, token: input.token } },
    update: { platform: input.platform ?? null },
    create: { userId, token: input.token, platform: input.platform ?? null },
  });
}

export async function unregisterDeviceToken(userId: string, token: string) {
  await prisma.deviceToken.deleteMany({ where: { userId, token } });
}