import { Router } from 'express';
import {
  requireSupabase,
  requireAdminRoles,
  AdminRole,
} from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  createSection,
  deleteSectionController,
  getHomepage,
  getHomepageConfig,
  listSections,
  reorderSections,
  updateHomepageConfig,
  updateSection,
} from './controller';
import {
  createSectionSchema,
  homepageConfigSchema,
  listSectionsQuerySchema,
  reorderSectionsSchema,
  updateSectionSchema,
} from './schema';

export const homepageRouter = Router();

// Public
homepageRouter.get('/homepage', getHomepage);

// Admin
homepageRouter.use('/admin/homepage', requireSupabase(), requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.CONTENT_MANAGER));

homepageRouter.get('/admin/homepage', getHomepageConfig);
homepageRouter.put('/admin/homepage', validate({ body: homepageConfigSchema }), updateHomepageConfig);
homepageRouter.get('/admin/homepage/sections', validate({ query: listSectionsQuerySchema }), listSections);
homepageRouter.post('/admin/homepage/sections', validate({ body: createSectionSchema }), createSection);
homepageRouter.patch('/admin/homepage/sections/reorder', validate({ body: reorderSectionsSchema }), reorderSections);
homepageRouter.patch('/admin/homepage/sections/:id', validate({ body: updateSectionSchema }), updateSection);
homepageRouter.delete('/admin/homepage/sections/:id', deleteSectionController);