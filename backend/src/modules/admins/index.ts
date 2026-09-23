import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Admin account & role management (Supabase-backed).
 * PHASE 3 implements the real controllers.
 */
export const adminsRouter = Router();

adminsRouter.use('/admins', requireSupabase());

adminsRouter.get('/admins', pending('list admins'));
adminsRouter.post('/admins', pending('create admin'));
adminsRouter.get('/admins/:id', pending('get admin'));
adminsRouter.patch('/admins/:id', pending('update admin'));
adminsRouter.delete('/admins/:id', pending('delete admin'));

// Role changes are restricted to SUPER_ADMIN and always audited.
adminsRouter.patch(
  '/admins/:id/role',
  requireAdminRoles(AdminRole.SUPER_ADMIN),
  pending('change admin role'),
);