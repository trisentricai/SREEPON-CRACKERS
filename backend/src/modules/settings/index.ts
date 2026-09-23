import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Store-wide configuration (store name, delivery fee, tax, maintenance mode,
 * legal pages, safety notices). PHASE 8/13 implement the real controllers.
 */
export const settingsRouter = Router();

// Public: read active store settings that the frontends need (not secrets).
settingsRouter.get('/settings/public', pending('public store settings'));
settingsRouter.get('/settings/legal', pending('legal & safety content'));

// Admin
settingsRouter.use('/admin/settings', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN));

settingsRouter.get('/admin/settings', pending('get all settings'));
settingsRouter.patch('/admin/settings', pending('update settings'));