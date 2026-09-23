import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, HttpStatus, ok, routeParam } from '../../utils/http';
import { getProfileByUid } from '../auth/service';
import type { AdminListCouponsQuery } from './schema';
import * as service from './service';

function resolveUserId(req: Request): Promise<string> {
  return getProfileByUid(req.user!.uid).then((user) => user.id);
}

export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.validateCoupon(await resolveUserId(req), req.body);
  res.json(ok(result, `Coupon ${result.coupon.code} applied`));
});

export const listCoupons = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<AdminListCouponsQuery>(req);
  const result = await service.listCoupons(query);
  res.json(ok(result, `${result.pagination.total} coupon(s)`));
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await service.createCoupon(req.body);
  res.status(HttpStatus.CREATED).json(ok(coupon, 'Coupon created'));
});

export const getCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await service.getCoupon(routeParam(req, 'id'));
  res.json(ok(coupon));
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await service.updateCoupon(routeParam(req, 'id'), req.body);
  res.json(ok(coupon, 'Coupon updated'));
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteCoupon(routeParam(req, 'id'));
  res.status(HttpStatus.NO_CONTENT).send();
});