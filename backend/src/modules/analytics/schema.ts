import { z } from 'zod';

/** Roll-up window in days for time-series endpoints. */
export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const topProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  days: z.coerce.number().int().min(1).max(365).default(365),
});

export const categoriesQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(365),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>;
export type CategoriesQuery = z.infer<typeof categoriesQuerySchema>;