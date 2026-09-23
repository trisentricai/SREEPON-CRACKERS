import { z } from 'zod';

/** Optional URL that can be explicitly set back to null to clear it. */
const optionalUrl = () => z.string().url().nullable().optional();

export const storeSettingsSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(120).optional(),
  tagline: z.string().max(300).optional(),
  supportEmail: z.string().trim().email('Support email must be a valid email address').or(z.literal('')).optional(),
  supportPhone: z.string().max(30).optional(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'Currency must be a 3-letter code (e.g. INR)')
    .transform((value) => value.toUpperCase())
    .optional(),
  maintenanceMode: z.boolean().optional(),
});

export const deliverySettingsSchema = z.object({
  enabled: z.boolean().optional(),
  deliveryFee: z.coerce.number().min(0, 'Delivery fee cannot be negative').max(100000).optional(),
  freeShippingAbove: z.coerce.number().min(0).max(1000000).nullable().optional(),
  deliveryNote: z.string().max(300).optional(),
});

export const taxSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  rate: z.coerce.number().min(0).max(100, 'Tax rate must be between 0 and 100').optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([0-9A-Z]{15})?$/, 'GSTIN must be a 15-character code')
    .optional(),
  taxInclusive: z.boolean().optional(),
});

export const socialSettingsSchema = z.object({
  facebookUrl: optionalUrl(),
  instagramUrl: optionalUrl(),
  youtubeUrl: optionalUrl(),
  tiktokUrl: optionalUrl(),
  whatsappNumber: z.string().max(30).nullable().optional(),
});

export const legalPageSchema = z.object({
  title: z.string().min(1, 'Page title is required').max(200),
  body: z.string().max(100000),
});

/** Ordered catalog of legal page slugs exposed publicly and editable by admins. */
export const legalPageKeys = ['privacy', 'terms', 'shipping', 'returns', 'refund', 'cancellation'] as const;
export type LegalPageKey = (typeof legalPageKeys)[number];

/** Legal pages support partial updates — the service merges into stored state. */
export const legalSettingsSchema = z
  .object({
    policies: z.record(z.enum(legalPageKeys), legalPageSchema).optional(),
    notices: z.array(legalPageSchema).max(50).optional(),
  })
  .refine((value) => value.policies !== undefined || value.notices !== undefined, {
    message: 'Provide policies or notices to update legal content',
  });

export const updateSettingsSchema = z
  .object({
    store: storeSettingsSchema.optional(),
    delivery: deliverySettingsSchema.optional(),
    tax: taxSettingsSchema.optional(),
    social: socialSettingsSchema.optional(),
    legal: legalSettingsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.store && !data.delivery && !data.tax && !data.social && !data.legal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide at least one settings group to update',
      });
    }
  });

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
export type DeliverySettingsInput = z.infer<typeof deliverySettingsSchema>;
export type TaxSettingsInput = z.infer<typeof taxSettingsSchema>;
export type SocialSettingsInput = z.infer<typeof socialSettingsSchema>;
export type LegalSettingsInput = z.infer<typeof legalSettingsSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export interface SettingsAuditContext {
  actorId: string | null;
  requestId?: string;
}