import { z } from 'zod';

/** Optional profile fields; null clears the stored value. */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').max(120).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.phone !== undefined, {
    message: 'Provide at least one of name or phone to update',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;