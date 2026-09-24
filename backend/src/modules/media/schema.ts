import { z } from 'zod';

export const signUploadSchema = z.object({
  folder: z.string().trim().max(200).optional(),
  resourceType: z.enum(['image', 'video', 'raw']).default('image'),
});

export type SignUploadInput = z.infer<typeof signUploadSchema>;

export const avatarUploadSchema = z.object({
  image: z.string().min(16, 'Image data is required'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;