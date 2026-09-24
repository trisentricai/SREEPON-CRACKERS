import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, ok } from '../../utils/http';
import type { AnalyticsQuery, CategoriesQuery, TopProductsQuery } from './schema';
import * as service from './service';

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await service.dashboard();
  res.json(ok(metrics));
});

export const getRevenueOverTime = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<AnalyticsQuery>(req);
  const items = await service.revenueOverTime(query);
  res.json(ok({ items }));
});

export const getOrdersOverTime = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<AnalyticsQuery>(req);
  const items = await service.ordersOverTime(query);
  res.json(ok({ items }));
});

export const getTopProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<TopProductsQuery>(req);
  const items = await service.topProducts(query);
  res.json(ok({ items }));
});

export const getCategoryPerformance = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<CategoriesQuery>(req);
  const items = await service.categoryPerformance(query);
  res.json(ok({ items, total: items.length }));
});