import { z } from 'zod';

const name = z.string().trim().min(2).max(80);
const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/u, 'Slug may contain lowercase letters, numbers and hyphens only');
const description = z.string().trim().max(2000).optional();
const parentId = z.string().uuid().nullable().optional();
const bannerImageUrl = z.string().url().max(500).nullable().optional();
const isFeatured = z.boolean().optional();
const isActive = z.boolean().optional();
const displayOrder = z.number().int().min(0).optional();

export const createCategorySchema = z
  .object({
    name,
    slug: slug.optional(),
    description,
    parentId,
    bannerImageUrl,
    isFeatured,
    isActive,
    displayOrder,
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: name.optional(),
    slug: slug.optional(),
    description: description.optional(),
    parentId: parentId.optional(),
    bannerImageUrl: bannerImageUrl.optional(),
    isFeatured: isFeatured.optional(),
    isActive: isActive.optional(),
    displayOrder: displayOrder.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const listCategoriesQuerySchema = z.object({
  parentId: z.string().uuid().optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export const reorderCategoriesSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        displayOrder: z.number().int().min(0),
      })
      .strict(),
  )
  .min(1, 'Provide at least one category to reorder')
  .max(200);

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;