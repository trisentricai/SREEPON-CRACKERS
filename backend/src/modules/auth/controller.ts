import type { Request, Response } from 'express';
import { asyncHandler, HttpStatus, ok } from '../../utils/http';
import { getProfileByUid, requestPasswordReset, revokeRefreshTokens, toPublicProfile, findOrCreateFromFirebase } from './service';

/**
 * Customer authentication bridge (Phase 3).
 * `requireFirebase()` has already verified the ID token and populated
 * `req.user` before these handlers run.
 */

export const login = asyncHandler(async (req: Request, res: Response) => {
  const claims = req.user!;
  const { user, created } = await findOrCreateFromFirebase(claims);
  res
    .status(created ? HttpStatus.CREATED : HttpStatus.OK)
    .json(ok(toPublicProfile(user), created ? 'Welcome to SriPon' : 'Welcome back'));
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const claims = req.user!;
  const { user, created } = await findOrCreateFromFirebase(claims);
  res.status(HttpStatus.CREATED).json(
    ok(toPublicProfile(user), created ? 'Account created' : 'You are already registered — continuing your session'),
  );
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const claims = req.user!;
  const user = await getProfileByUid(claims.uid);
  res.json(
    ok({
      ...toPublicProfile(user),
      emailVerified: claims.email_verified ?? false,
    }),
  );
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await revokeRefreshTokens(req.user!.uid);
  res.status(HttpStatus.NO_CONTENT).send();
});

export const passwordReset = asyncHandler(async (req: Request, res: Response) => {
  const result = await requestPasswordReset(req.body.email);
  res
    .status(HttpStatus.ACCEPTED)
    .json(ok(result, 'If this email belongs to a registered account, a reset link is on its way'));
});