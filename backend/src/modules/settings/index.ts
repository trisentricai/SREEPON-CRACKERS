import { Router } from 'express';
import { validate } from '../../middleware/validation.middleware';
import {
  requireSupabase,
  requireAdminRoles,
  AdminRole,
} from '../../middleware/auth.middleware';
import { getAllSettings, getLegalSettings, getPublicSettings, updateSettings } from './controller';
import { updateSettingsSchema } from './schema';

export const settingsRouter = Router();

// Public: read active store settings the frontends need (never secrets).
settingsRouter.get('/settings/public', getPublicSettings);
settingsRouter.get('/settings/legal', getLegalSettings);

// Admin
settingsRouter.use('/admin/settings', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN));

settingsRouter.get('/admin/settings', getAllSettings);
settingsRouter.patch('/admin/settings', validate({ body: updateSettingsSchema }), updateSettings);