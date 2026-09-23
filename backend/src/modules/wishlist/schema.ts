import { z } from 'zod';

export const addWishlistItemSchema = z.object({
  productId: z.string().uuid(),
});

export type AddWishlistItemInput = z.infer<typeof addWishlistItemSchema>;