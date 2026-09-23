import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { loginLimiter, passwordLimiter } from '../../utils/rate-limit';
import * as controller from './controller';
import { loginRequestSchema, passwordResetRequestSchema, registerRequestSchema } from './schema';

/**
 * Customer authentication (Firebase). Firebase is the identity provider; this
 * module bridges verified Firebase identities with the local customer profile
 * and manages the flows that need server-side help (reset links, token
 * revocation).
 *
 * Phase 3 implementation:
 *  - POST /auth/login        → verify ID token, find-or-create local User
 *  - POST /auth/register     → same bridge; created when the User row is new
 *  - POST /auth/password/reset → Firebase-generated reset link
 *  - POST /auth/logout       → revoke the customer's refresh tokens
 *  - GET  /auth/me           → current customer profile
 */
export const authRouter = Router();

authRouter.post(
  '/auth/login',
  loginLimiter(),
  validate({ body: loginRequestSchema }),
  requireFirebase(),
  controller.login,
);
authRouter.post(
  '/auth/register',
  loginLimiter(),
  validate({ body: registerRequestSchema }),
  requireFirebase(),
  controller.register,
);
authRouter.post(
  '/auth/password/reset',
  passwordLimiter(),
  validate({ body: passwordResetRequestSchema }),
  controller.passwordReset,
);
authRouter.post('/auth/logout', requireFirebase(), controller.logout);
authRouter.get('/auth/me', requireFirebase(), controller.me);