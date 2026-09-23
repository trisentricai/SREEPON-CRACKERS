import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Promotional banner/poster CMS. Banners are served from the API so the website
 * and the Flutter app reflect admin changes without redeploying.
 * PHASE 8 implements the real controllers.
 */
export const bannersRouter = Router();

// Public (cacheable)
bannersRouter.get('/banners', pending('list active banners'));
bannersRouter.get('/banners/:placement', pending('list banners for placement'));

// Admin
bannersRouter.use('/admin/banners', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.CONTENT_MANAGER));

bannersRouter.get('/admin/banners', pending('list all banners'));
bannersRouter.post('/admin/banners', pending('create banner'));
bannersRouter.get('/admin/banners/:id', pending('get banner'));
bannersRouter.patch('/admin/banners/:id', pending('update banner'));
bannersRouter.delete('/admin/banners/:id', pending('delete banner'));
bannersRouter.post('/admin/banners/:id/duplicate', pending('duplicate banner'));
bannersRouter.patch('/admin/banners/:id/activate', pending('activate banner'));
bannersRouter.patch('/admin/banners/reorder', pending('reorder banners'));