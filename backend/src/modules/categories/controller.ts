import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, ok, routeParam } from '../../utils/http';
import type { ListCategoriesQuery, ReorderCategoriesInput } from './schema';
import * as service from './service';

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<ListCategoriesQuery>(req);
  const categories = await service.listCategories(query);
  res.json(ok(categories, `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`));
});

export const getCategoryTree = asyncHandler(async (_req: Request, res: Response) => {
  const tree = await service.getCategoryTree(false);
  res.json(ok(tree, 'Category tree'));
});

export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const category = await service.getCategoryBySlug(routeParam(req, 'slug'));
  res.json(ok(category));
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await service.createCategory(req.body);
  res.status(201).json(ok(category, 'Category created'));
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await service.updateCategory(routeParam(req, 'id'), req.body);
  res.json(ok(category, 'Category updated'));
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteCategory(routeParam(req, 'id'));
  res.status(204).send();
});

export const reorderCategories = asyncHandler(async (req: Request, res: Response) => {
  const order = await service.reorderCategories(req.body as ReorderCategoriesInput);
  res.json(ok(order, 'Category order saved'));
});