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

/** Body for the manual new-order sweep (all fields optional → `{}` works). */
export const sweepOrdersSchema = z
  .object({
    lookbackMinutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .default({});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type SweepOrdersInput = z.infer<typeof sweepOrdersSchema>;
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;