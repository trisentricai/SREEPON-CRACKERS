import { z } from 'zod';
import { HomepageSectionType as HomepageSectionTypeEnum, type HomepageSectionType } from '../../types/enums';

const sectionTypeValues = Object.values(HomepageSectionTypeEnum) as [HomepageSectionType, ...HomepageSectionType[]];

/** Free-form JSON config attached to a section (productIds, categoryIds, limit, props...). */
export const sectionConfigSchema = z.record(z.unknown()).nullish();

export const createSectionSchema = z.object({
  type: z.enum(sectionTypeValues),
  title: z.string().trim().max(200).optional(),
  config: z.record(z.unknown()).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateSectionSchema = createSectionSchema.partial();

export const homepageConfigSchema = z
  .object({
    heroTitle: z.string().trim().max(200).optional(),
    heroTagline: z.string().trim().max(400).optional(),
  })
  .passthrough();

export const reorderSectionsSchema = z.object({
  items: z
    .array(z.object({ id: z.string().uuid(), displayOrder: z.coerce.number().int().min(0) }))
    .min(1)
    .max(200),
});

export const listSectionsQuerySchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type HomepageConfigInput = z.infer<typeof homepageConfigSchema>;
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
export type ListSectionsQuery = z.infer<typeof listSectionsQuerySchema>;