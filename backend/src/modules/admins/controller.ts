import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, ok, routeParam } from '../../utils/http';
import type { ChangeAdminRoleInput, CreateAdminInput, ListAdminsQuery, UpdateAdminInput } from './schema';
import * as service from './service';

export const listAdmins = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<ListAdminsQuery>(req);
  const result = await service.listAdmins(query);
  res.json(ok(result, 'Admins fetched'));
});

export const getAdmin = asyncHandler(async (req: Request, res: Response) => {
  const admin = await service.getAdmin(routeParam(req, 'id'));
  res.json(ok(admin, 'Admin fetched'));
});

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const admin = await service.createAdmin(req.body as CreateAdminInput);
  res.status(201).json(ok(admin, 'Admin created'));
});

export const updateAdmin = asyncHandler(async (req: Request, res: Response) => {
  const admin = await service.updateAdmin(routeParam(req, 'id'), req.body as UpdateAdminInput);
  res.json(ok(admin, 'Admin updated'));
});

export const changeAdminRole = asyncHandler(async (req: Request, res: Response) => {
  const admin = await service.changeAdminRole(
    routeParam(req, 'id'),
    req.body as ChangeAdminRoleInput,
    req.admin?.sub ?? 'unknown',
  );
  res.json(ok(admin, 'Admin role updated'));
});

export const deleteAdmin = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteAdmin(routeParam(req, 'id'));
  res.json(ok(null, 'Admin deleted'));
});