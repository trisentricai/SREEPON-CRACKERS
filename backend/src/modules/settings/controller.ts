import type { Request, Response } from 'express';
import { asyncHandler, ok } from '../../utils/http';
import type { UpdateSettingsInput } from './schema';
import * as service from './service';

function adminActor(req: Request): string | null {
  return req.admin?.sub ?? null;
}

function requestId(req: Request): string | undefined {
  return req.get('x-request-id') ?? undefined;
}

export const getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
  res.json(ok(await service.getPublicSettings()));
});

export const getLegalSettings = asyncHandler(async (_req: Request, res: Response) => {
  res.json(ok(await service.getLegalSettings()));
});

export const getAllSettings = asyncHandler(async (_req: Request, res: Response) => {
  res.json(ok(await service.getAllSettings()));
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateSettingsInput;
  const settings = await service.updateSettings(body, { actorId: adminActor(req), requestId: requestId(req) });
  res.json(ok(settings, 'Settings updated'));
});