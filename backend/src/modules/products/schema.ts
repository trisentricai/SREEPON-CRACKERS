import { z } from 'zod';

const MAX_PAGE_SIZE = 100;

/** Money accepted as number or numeric string; normalized to a fixed 2dp string. */
const money = z
  .union([z.string().trim().regex(/^\d+(\.\d{1,2})?$/u), z.number().nonnegative()])
  .transform((v) => (typeof v === 'number' ? v.toFixed(2) : Number(v).toFixed(2)));

const name = z.string().trim().min(2).max(200);
const slug = z
  .string()
  .trim()
  .min(2)
  .max(200)
  .regex(/^[a-z0-9-]+$/u, 'Slug may contain lowercase letters, numbers and hyphens only');
const sku = z.string().trim().min(1).max(64);
const unit = z.enum(['BOX', 'PACKET', 'SINGLE', 'OTHER']);

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
  category: z.string().min(1).optional(),
  q: z.string().trim().max(200).optional(),
  minPrice: money.optional(),
  maxPrice: money.optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'featured', 'name_asc']).optional(),
});

export const adminProductQuerySchema = productQuerySchema.extend({
  isActive: z.coerce.boolean().optional(),
  isApproved: z.coerce.boolean().optional(),
});

export const searchProductsQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
  category: z.string().min(1).optional(),
});

export const createProductSchema = z
  .object({
    name,
    slug: slug.optional(),
    sku,
    description: z.string().trim().max(10000).optional(),
    shortDescription: z.string().trim().max(300).optional(),
    categoryId: z.string().uuid().nullable().optional(),
    basePrice: money,
    mrpPrice: money.optional(),
    unit: unit.default('BOX'),
    piecesPerBox: z.number().int().positive().nullable().optional(),
    weightPerBox: money.optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    minimumAge: z.number().int().min(0).max(120).nullable().default(18),
    isApproved: z.boolean().optional(),
    images: z
      .array(
        z
          .object({
            url: z.string().url().max(500),
            cloudinaryPublicId: z.string().trim().max(200).optional(),
            altText: z.string().trim().max(200).optional(),
          })
          .strict(),
      )
      .max(20)
      .optional(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: name.optional(),
    slug: slug.optional(),
    sku: sku.optional(),
    description: z.string().trim().max(10000).nullable().optional(),
    shortDescription: z.string().trim().max(300).nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    basePrice: money.optional(),
    mrpPrice: money.nullable().optional(),
    unit: unit.optional(),
    piecesPerBox: z.number().int().positive().nullable().optional(),
    weightPerBox: money.nullable().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    minimumAge: z.number().int().min(0).max(120).nullable().optional(),
    isApproved: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const setProductVisibilitySchema = z
  .object({ isActive: z.boolean() })
  .strict();

export const createProductImageSchema = z
  .object({
    url: z.string().url().max(500),
    cloudinaryPublicId: z.string().trim().max(200),
    altText: z.string().trim().max(200).optional(),
  })
  .strict();

export const updateProductImageSchema = z
  .object({
    url: z.string().url().max(500).optional(),
    cloudinaryPublicId: z.string().trim().max(200).optional(),
    altText: z.string().trim().max(200).nullable().optional(),
    displayOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const reorderProductImagesSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        displayOrder: z.number().int().min(0),
      })
      .strict(),
  )
  .min(1, 'Provide at least one image to reorder')
  .max(50);

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type AdminProductQuery = z.infer<typeof adminProductQuerySchema>;
export type SearchProductsQuery = z.infer<typeof searchProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateProductImageInput = z.infer<typeof createProductImageSchema>;
export type UpdateProductImageInput = z.infer<typeof updateProductImageSchema>;
export type ReorderProductImagesInput = z.infer<typeof reorderProductImagesSchema>;
export type Money = string;