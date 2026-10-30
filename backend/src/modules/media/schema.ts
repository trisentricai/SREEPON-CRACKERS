import { z } from 'zod';

export const signUploadSchema = z.object({
  /** Cloudinary folder: alphanumeric, `_`, `-`, `.`, `/` only; no `..` segments. */
  folder: z
    .string()
    .trim()
    .max(200)
    .regex(/^[a-zA-Z0-9._\-/]*$/, 'Folder may only contain letters, numbers, _, -, . and /')
    .refine((f) => !f.includes('..') && !f.startsWith('/') && !f.endsWith('/') && !f.includes('//'), {
      message: 'Folder must not contain path traversal segments',
    })
    .optional(),
  resourceType: z.enum(['image', 'video', 'raw']).default('image'),
});

export type SignUploadInput = z.infer<typeof signUploadSchema>;

export const avatarUploadSchema = z.object({
  image: z.string().min(16, 'Image data is required'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;