import { Router } from 'express';
import { loginLimiter, passwordLimiter } from '../../utils/rate-limit';
import { pending } from '../helpers';

/**
 * Customer authentication (Firebase). Firebase is the identity provider;
 * this module bridges Firebase verified identities with the local customer
 * profile and manages pre-signed flows where Firebase needs server help.
 *
 * PHASE 3 implements the real controllers:
 *  - POST /auth/login  → verify Firebase ID token, find-or-create local User
 *  - POST /auth/register → create Firebase account + local User
 *  - POST /auth/password/reset → Firebase password reset email
 *  - POST /auth/logout → revoke refresh tokens where applicable
 *  - GET  /auth/me     → current customer profile
 */
export const authRouter = Router();

authRouter.post('/auth/login', loginLimiter(), pending('customer login'));
authRouter.post('/auth/register', loginLimiter(), pending('customer register'));
authRouter.post('/auth/password/reset', passwordLimiter(), pending('password reset'));
authRouter.get('/auth/me', pending('auth me'));