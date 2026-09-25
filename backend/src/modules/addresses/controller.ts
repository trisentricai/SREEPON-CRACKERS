import type { Request, Response } from 'express';
import { asyncHandler, HttpStatus, ok, routeParam } from '../../utils/http';
import { getProfileByUid } from '../auth/service';
import type { CreateAddressInput, UpdateAddressInput } from './schema';
import * as service from './service';

function resolveUserId(req: Request): Promise<string> {
  return getProfileByUid(req.user!.uid).then((user) => user.id);
}

export const listAddresses = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await service.listAddresses(await resolveUserId(req));
  res.json(ok(addresses, `${addresses.length} address(es)`));
});

export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await service.createAddress(await resolveUserId(req), req.body as CreateAddressInput);
  res.status(HttpStatus.CREATED).json(ok(address, 'Address created'));
});

export const getAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await service.getAddress(await resolveUserId(req), routeParam(req, 'id'));
  res.json(ok(address));
});

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await service.updateAddress(await resolveUserId(req), routeParam(req, 'id'), req.body as UpdateAddressInput);
  res.json(ok(address, 'Address updated'));
});

export const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await service.setDefaultAddress(await resolveUserId(req), routeParam(req, 'id'));
  res.json(ok(address, 'Default address set'));
});

export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteAddress(await resolveUserId(req), routeParam(req, 'id'));
  res.status(HttpStatus.NO_CONTENT).send();
});