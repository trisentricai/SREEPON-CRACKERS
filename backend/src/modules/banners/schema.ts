import { z } from 'zod';
import {
  BannerActionType as BannerActionTypeEnum,
  BannerPlacement as BannerPlacementEnum,
  type BannerActionType,
  type BannerPlacement,
} from '../../types/enums';

const bannerPlacementValues = Object.values(BannerPlacementEnum) as [BannerPlacement, ...BannerPlacement[]];
const bannerActionTypeValues = Object.values(BannerActionTypeEnum) as [BannerActionType, ...BannerActionType[]];

const bannerFields = z.object({
  placement: z.enum(bannerPlacementValues),
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(320).optional(),
  imageUrl: z.string().trim().url().max(800),
  actionType: z.enum(bannerActionTypeValues),
  actionTarget: z.string().trim().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

export const createBannerSchema = bannerFields.superRefine((value, ctx) => {
  if (value.startAt && value.endAt && value.startAt > value.endAt) {
    ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'endAt must be after startAt' });
  }
  if (value.actionType === 'LINKED_CATEGORY' && !value.categoryId) {
    ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'categoryId is required for LINKED_CATEGORY banners' });
  }
  if (value.actionType !== 'LINKED_CATEGORY' && !value.actionTarget) {
    ctx.addIssue({ code: 'custom', path: ['actionTarget'], message: 'actionTarget is required for this action type' });
  }
});

export const updateBannerSchema = bannerFields.partial().superRefine((value, ctx) => {
  if (value.startAt && value.endAt && value.startAt > value.endAt) {
    ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'endAt must be after startAt' });
  }
  if (value.actionType === 'LINKED_CATEGORY' && !value.categoryId && !value.actionTarget) {
    ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'categoryId is required for LINKED_CATEGORY banners' });
  }
  if (value.actionType && value.actionType !== 'LINKED_CATEGORY' && !value.actionTarget) {
    ctx.addIssue({ code: 'custom', path: ['actionTarget'], message: 'actionTarget is required for this action type' });
  }
});

export const activateBannerSchema = z.object({
  isActive: z.boolean(),
});

export const adminListBannersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  placement: z.enum(bannerPlacementValues).optional(),
  isActive: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  q: z.string().trim().max(120).optional(),
});

export const reorderBannersSchema = z.object({
  items: z
    .array(z.object({ id: z.string().uuid(), displayOrder: z.coerce.number().int().min(0) }))
    .min(1)
    .max(200),
});

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type ActivateBannerInput = z.infer<typeof activateBannerSchema>;
export type AdminListBannersQuery = z.infer<typeof adminListBannersQuerySchema>;
export type ReorderBannersInput = z.infer<typeof reorderBannersSchema>;