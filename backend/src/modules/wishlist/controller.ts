import type { Request, Response } from 'express';
import { asyncHandler, HttpStatus, ok, routeParam } from '../../utils/http';
import { getProfileByUid } from '../auth/service';
import * as service from './service';

function resolveUserId(req: Request): Promise<string> {
  return getProfileByUid(req.user!.uid).then((user) => user.id);
}

export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const items = await service.getWishlist(await resolveUserId(req));
  res.json(ok(items, `${items.length} item(s) in wishlist`));
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const { item, created } = await service.addToWishlist(await resolveUserId(req), req.body);
  res.status(created ? HttpStatus.CREATED : HttpStatus.OK).json(ok(item, created ? 'Added to wishlist' : 'Already in wishlist'));
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  await service.removeFromWishlist(await resolveUserId(req), routeParam(req, 'productId'));
  res.status(HttpStatus.NO_CONTENT).send();
});

export const moveToCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await service.moveToCart(await resolveUserId(req), routeParam(req, 'productId'));
  res.json(ok(cart, 'Moved to cart'));
});