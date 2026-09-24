import type { Request, Response } from 'express';
import { asyncHandler, ok } from '../../utils/http';
import type { AvatarUploadInput, SignUploadInput } from './schema';
import * as service from './service';

export const signUpload = asyncHandler(async (req: Request, res: Response) => {
  const payload = await service.signUpload(req.body as SignUploadInput);
  res.json(ok(payload, 'Upload signature ready'));
});

export const uploadMyAvatar = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.updateAvatar(req.user!.uid, req.body as AvatarUploadInput);
  res.json(ok(result, 'Avatar updated'));
});