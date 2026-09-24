import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, ok } from '../../utils/http';
import type { UpdateProfileInput } from './schema';
import * as service from './service';

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await service.getProfile(req.user!.uid);
  res.json(ok(profile));
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await service.updateProfile(req.user!.uid, req.body as UpdateProfileInput);
  res.json(ok(profile, 'Profile updated'));
});

export const getMyOrderHistory = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<{ page: number; limit: number }>(req);
  const result = await service.getMyOrders(req.user!.uid, query);
  res.json(ok(result, `${result.pagination.total} order(s)`));
});