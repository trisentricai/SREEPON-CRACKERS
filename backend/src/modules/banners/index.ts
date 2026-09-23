import { Router } from 'express';
import { validate } from '../../middleware/validation.middleware';
import {
  requireSupabase,
  requireAdminRoles,
  AdminRole,
} from '../../middleware/auth.middleware';
import {
  activateBanner,
  createBanner,
  deleteBanner,
  duplicateBanner,
  getBanner,
  listActiveBanners,
  listAllBanners,
  listBannersForPlacement,
  reorderBanners,
  updateBanner,
} from './controller';
import {
  activateBannerSchema,
  adminListBannersQuerySchema,
  createBannerSchema,
  reorderBannersSchema,
  updateBannerSchema,
} from './schema';

export const bannersRouter = Router();

// Public (cacheable)
bannersRouter.get('/banners', listActiveBanners);
bannersRouter.get('/banners/:placement', listBannersForPlacement);

// Admin
bannersRouter.use('/admin/banners', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.CONTENT_MANAGER));

bannersRouter.get('/admin/banners', validate({ query: adminListBannersQuerySchema }), listAllBanners);
bannersRouter.post('/admin/banners', validate({ body: createBannerSchema }), createBanner);
bannersRouter.patch('/admin/banners/reorder', validate({ body: reorderBannersSchema }), reorderBanners);
bannersRouter.get('/admin/banners/:id', getBanner);
bannersRouter.patch('/admin/banners/:id', validate({ body: updateBannerSchema }), updateBanner);
bannersRouter.delete('/admin/banners/:id', deleteBanner);
bannersRouter.post('/admin/banners/:id/duplicate', duplicateBanner);
bannersRouter.patch('/admin/banners/:id/activate', validate({ body: activateBannerSchema }), activateBanner);