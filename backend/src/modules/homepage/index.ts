import { Router } from 'express';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { pending } from '../helpers';

/**
 * Homepage CMS. Configuration lives in PostgreSQL; the public homepage endpoint
 * assembles the page from active sections, banners, products and categories.
 * PHASE 8 implements the real controllers.
 */
export const homepageRouter = Router();

// Public
homepageRouter.get('/homepage', pending('get composed homepage'));

// Admin
homepageRouter.use('/admin/homepage', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.CONTENT_MANAGER));

homepageRouter.get('/admin/homepage', pending('get homepage configuration'));
homepageRouter.put('/admin/homepage', pending('update homepage configuration'));
homepageRouter.get('/admin/homepage/sections', pending('list sections'));
homepageRouter.post('/admin/homepage/sections', pending('create section'));
homepageRouter.patch('/admin/homepage/sections/:id', pending('update section'));
homepageRouter.delete('/admin/homepage/sections/:id', pending('delete section'));
homepageRouter.patch('/admin/homepage/sections/reorder', pending('reorder sections'));