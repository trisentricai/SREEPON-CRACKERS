import { z } from 'zod';
import { ADMIN_ROLES, AdminRole } from '../../types/enums';

export const listAdminsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
});

export const createAdminSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  name: z.string().trim().max(100).optional(),
  role: z.enum(ADMIN_ROLES as unknown as [AdminRole, ...AdminRole[]]),
});

export const updateAdminSchema = z
  .object({
    email: z.string().trim().email().max(320).optional(),
    name: z.string().trim().max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.email !== undefined || value.name !== undefined || value.isActive !== undefined, {
    message: 'At least one field is required',
  });

export const changeAdminRoleSchema = z.object({
  role: z.enum(ADMIN_ROLES as unknown as [AdminRole, ...AdminRole[]]),
});

export type ListAdminsQuery = z.infer<typeof listAdminsQuerySchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type ChangeAdminRoleInput = z.infer<typeof changeAdminRoleSchema>;