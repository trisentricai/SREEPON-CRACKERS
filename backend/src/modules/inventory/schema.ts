import { z } from 'zod';

export const listInventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
});

export const adjustStockSchema = z
  .object({
    delta: z
      .number()
      .int('Delta must be a whole number')
      .refine((value) => value !== 0, 'Delta cannot be zero'),
    reason: z.enum(['RECOUNT', 'DAMAGE', 'RETURN', 'STOCK_IN', 'CANCELLATION', 'OTHER'], {
      message: 'Invalid adjustment reason',
    }),
    note: z.string().trim().max(500).optional(),
  });

export const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type TransactionsQuery = z.infer<typeof transactionsQuerySchema>;