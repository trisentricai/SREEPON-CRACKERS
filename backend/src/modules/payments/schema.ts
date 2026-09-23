import { z } from 'zod';

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.enum(['razorpay', 'stripe', 'mock', 'cash']),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;