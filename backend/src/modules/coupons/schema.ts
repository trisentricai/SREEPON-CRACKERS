import { z } from 'zod';
import { DiscountType as DiscountTypeEnum, type DiscountType } from '../../types/enums';

const discountTypeValues = Object.values(DiscountTypeEnum) as [DiscountType, ...DiscountType[]];

export const validateCouponSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(50),
  orderSubtotal: z.coerce.number().min(0),
});

const couponBaseSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(50),
  type: z.enum(discountTypeValues),
  value: z.coerce.number().min(0.01),
  maxDiscount: z.coerce.number().min(0.01).optional(),
  minOrderValue: z.coerce.number().min(0).optional(),
  usageLimit: z.coerce.number().int().min(1).optional(),
  perUserLimit: z.coerce.number().int().min(1).default(1),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

export const createCouponSchema = couponBaseSchema.refine(
  (value) => !value.startAt || !value.endAt || value.startAt <= value.endAt,
  { message: 'startAt must be before endAt', path: ['endAt'] },
);

export const updateCouponSchema = couponBaseSchema
  .partial()
  .refine((value) => !value.startAt || !value.endAt || value.startAt <= value.endAt, {
    message: 'startAt must be before endAt',
    path: ['endAt'],
  });

export const adminListCouponsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  isActive: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type AdminListCouponsQuery = z.infer<typeof adminListCouponsQuerySchema>;