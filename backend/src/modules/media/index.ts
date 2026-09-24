import { Router } from 'express';
import { requireAdminRoles, requireFirebase, requireSupabase, AdminRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { signUpload, uploadMyAvatar } from './controller';
import { avatarUploadSchema, signUploadSchema } from './schema';

/** Media endpoints: Cloudinary signed uploads (admin) and avatar (customer). */
export const mediaRouter = Router();

// Admin signed upload for straight-to-Cloudinary client uploads.
mediaRouter.post(
  '/admin/media/sign',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.PRODUCT_MANAGER, AdminRole.CONTENT_MANAGER),
  validate({ body: signUploadSchema }),
  signUpload,
);

// Customer avatar (Firebase-authenticated).
mediaRouter.post(
  '/users/me/avatar',
  requireFirebase(),
  validate({ body: avatarUploadSchema }),
  uploadMyAvatar,
);