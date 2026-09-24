import { Router } from 'express';
import { requireAdminRoles, requireSupabase, AdminRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  changeAdminRole,
  createAdmin,
  deleteAdmin,
  getAdmin,
  listAdmins,
  updateAdmin,
} from './controller';
import { changeAdminRoleSchema, createAdminSchema, listAdminsQuerySchema, updateAdminSchema } from './schema';

/**
 * Admin account & role management (Supabase-backed).
 * Admin accounts live in Supabase Auth; the service role manages them.
 */
export const adminsRouter = Router();

// Listing requires any authenticated admin user.
adminsRouter.get(
  '/admins',
  requireSupabase(),
  validate({ query: listAdminsQuerySchema }),
  listAdmins,
);

// Creating/updating admin accounts is restricted to SUPER_ADMIN and ADMIN.
adminsRouter.post(
  '/admins',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN),
  validate({ body: createAdminSchema }),
  createAdmin,
);
adminsRouter.patch(
  '/admins/:id',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN),
  validate({ body: updateAdminSchema }),
  updateAdmin,
);
adminsRouter.delete(
  '/admins/:id',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN),
  deleteAdmin,
);

// Profile lookup for the admin dashboard (any authenticated admin).
adminsRouter.get('/admins/:id', requireSupabase(), getAdmin);

// Role changes are restricted to SUPER_ADMIN and always audited.
adminsRouter.patch(
  '/admins/:id/role',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN),
  validate({ body: changeAdminRoleSchema }),
  changeAdminRole,
);