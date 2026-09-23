import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, ok, routeParam } from '../../utils/http';
import type {
  AdminProductQuery,
  ProductQuery,
  ReorderProductImagesInput,
  SearchProductsQuery,
} from './schema';
import * as service from './service';

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<ProductQuery>(req);
  const result = await service.listPublished(query);
  res.json(ok(result, `${result.pagination.total} product(s)`));
});

export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<SearchProductsQuery>(req);
  const result = await service.searchProducts(query);
  res.json(ok(result, `${result.pagination.total} result(s)`));
});

export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await service.getPublishedBySlug(routeParam(req, 'slug'));
  res.json(ok(product));
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await service.getPublishedById(routeParam(req, 'id'));
  res.json(ok(product));
});

export const adminListProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<AdminProductQuery>(req);
  const result = await service.listForAdmin(query);
  res.json(ok(result, `${result.pagination.total} product(s)`));
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await service.createProduct(req.body);
  res.status(201).json(ok(product, 'Product created'));
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await service.updateProduct(routeParam(req, 'id'), req.body);
  res.json(ok(product, 'Product updated'));
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteProduct(routeParam(req, 'id'));
  res.status(204).send();
});

export const setProductVisibility = asyncHandler(async (req: Request, res: Response) => {
  const product = await service.setProductVisibility(routeParam(req, 'id'), req.body.isActive);
  res.json(ok({ id: product.id, isActive: product.isActive }, 'Product visibility updated'));
});

export const addProductImage = asyncHandler(async (req: Request, res: Response) => {
  const image = await service.addProductImage(routeParam(req, 'id'), req.body);
  res.status(201).json(ok(image, 'Image added'));
});

export const updateProductImage = asyncHandler(async (req: Request, res: Response) => {
  const image = await service.updateProductImage(routeParam(req, 'imageId'), req.body);
  res.json(ok(image, 'Image updated'));
});

export const deleteProductImage = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteProductImage(routeParam(req, 'imageId'));
  res.status(204).send();
});

export const reorderProductImages = asyncHandler(async (req: Request, res: Response) => {
  const order = await service.reorderProductImages(routeParam(req, 'id'), req.body as ReorderProductImagesInput);
  res.json(ok(order, 'Image order saved'));
});