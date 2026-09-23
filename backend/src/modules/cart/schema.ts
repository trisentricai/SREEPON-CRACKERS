import { z } from 'zod';

export const cartUnit = z.enum(['BOX', 'PACKET', 'SINGLE']);

const cartItemInput = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(999),
  unit: cartUnit.default('BOX'),
});

/** Add an item to the user's cart (merged by product + unit). */
export const addCartItemSchema = cartItemInput;

/** Change an existing line's quantity (absolute, not delta). */
export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(999),
});

/** Guest cart hand-off: one or more unauthenticated lines to merge in. */
export const mergeCartSchema = z.object({
  items: z.array(cartItemInput).min(1).max(200),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type MergeCartItemInput = z.infer<typeof cartItemInput>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;