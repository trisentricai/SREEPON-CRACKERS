import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const registerDeviceSchema = z.object({
  token: z.string().trim().min(1, 'Device token is required').max(512),
  platform: z.enum(['android', 'ios', 'web', 'other']).optional(),
});

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;