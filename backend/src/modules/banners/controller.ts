import type { Request, Response } from 'express';
import { BannerPlacement } from '../../types/enums';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { ApiError, asyncHandler, HttpStatus, ok, routeParam } from '../../utils/http';
import type { AdminListBannersQuery, ReorderBannersInput } from './schema';
import * as service from './service';

function adminActor(req: Request): string | null {
  return req.admin?.sub ?? null;
}

function requestId(req: Request): string | undefined {
  return req.get('x-request-id') ?? undefined;
}

export const listActiveBanners = asyncHandler(async (_req: Request, res: Response) => {
  const banners = await service.listActiveBanners();
  res.json(ok(banners, `${banners.length} active banner(s)`));
});

export const listBannersForPlacement = asyncHandler(async (req: Request, res: Response) => {
  const placement = routeParam(req, 'placement');
  if (!Object.values(BannerPlacement).includes(placement as BannerPlacement)) {
    throw ApiError.badRequest('Invalid banner placement');
  }
  const banners = await service.listBannersForPlacement(placement as BannerPlacement);
  res.json(ok(banners, `${banners.length} active banner(s)`));
});

export const listAllBanners = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<AdminListBannersQuery>(req);
  const result = await service.listAllBanners(query);
  res.json(ok(result, `${result.pagination.total} banner(s)`));
});

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await service.createBanner(req.body, adminActor(req), requestId(req));
  res.status(HttpStatus.CREATED).json(ok(banner, 'Banner created'));
});

export const getBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await service.getBanner(routeParam(req, 'id'));
  res.json(ok(banner));
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await service.updateBanner(routeParam(req, 'id'), req.body, adminActor(req), requestId(req));
  res.json(ok(banner, 'Banner updated'));
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteBanner(routeParam(req, 'id'), adminActor(req), requestId(req));
  res.status(HttpStatus.NO_CONTENT).send();
});

export const duplicateBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await service.duplicateBanner(routeParam(req, 'id'), adminActor(req), requestId(req));
  res.status(HttpStatus.CREATED).json(ok(banner, 'Banner duplicated'));
});

export const activateBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await service.activateBanner(routeParam(req, 'id'), req.body, adminActor(req));
  res.json(ok(banner, banner.isActive ? 'Banner activated' : 'Banner deactivated'));
});

export const reorderBanners = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.reorderBanners((req.body as ReorderBannersInput).items);
  res.json(ok(result, 'Banner order saved'));
});