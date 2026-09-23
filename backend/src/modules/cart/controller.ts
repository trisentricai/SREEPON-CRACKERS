import type { Request, Response } from 'express';
import { asyncHandler, HttpStatus, ok, routeParam } from '../../utils/http';
import { getProfileByUid } from '../auth/service';
import * as service from './service';

function resolveUserId(req: Request): Promise<string> {
  return getProfileByUid(req.user!.uid).then((user) => user.id);
}

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await service.getCart(await resolveUserId(req));
  res.json(ok(cart, `${cart.itemCount} item(s) in cart`));
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await service.addItem(await resolveUserId(req), req.body);
  res.status(HttpStatus.CREATED).json(ok(cart, 'Item added to cart'));
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await service.updateItem(await resolveUserId(req), routeParam(req, 'itemId'), req.body);
  res.json(ok(cart, 'Cart updated'));
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  await service.removeItem(await resolveUserId(req), routeParam(req, 'itemId'));
  res.status(HttpStatus.NO_CONTENT).send();
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  await service.clearCart(await resolveUserId(req));
  res.status(HttpStatus.NO_CONTENT).send();
});

export const mergeCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await service.mergeGuestCart(await resolveUserId(req), req.body.items);
  res.json(ok(cart, 'Guest cart merged'));
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const cartSummary = await service.getCartSummary(await resolveUserId(req));
  res.json(ok(cartSummary));
});