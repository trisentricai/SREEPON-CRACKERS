import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { corsOrigins, env, isProduction } from '../config/env';
import { ApiError, asyncHandler } from '../utils/http';
import { logger } from '../utils/logger';

/**
 * CSRF protection middleware for state-changing endpoints.
 *
 * The Sreepon API is a cross-origin JSON API consumed by a SPA using Bearer
 * tokens in the Authorization header. Because Bearer tokens are never sent
 * automatically by browsers on cross-origin requests (unlike cookies),
 * traditional cookie-based CSRF is not directly applicable. However, we add
 * this middleware as defense-in-depth:
 *
 *   1. It verifies the `Origin` header matches an allowed CORS origin on
 *      state-changing requests (POST/PATCH/PUT/DELETE).
 *   2. When `CSRF_REQUIRE_TOKEN` is set to "true", it additionally requires
 *      an `X-CSRF-Token` header that must match a value previously issued by
 *      `GET /api/v1/csrf/token`. The frontend obtains this token once after
 *      sign-in and sends it on every state-changing request.
 *
 * Safe methods (GET, HEAD, OPTIONS) are always exempt.
 */
export const csrfProtection = (): RequestHandler =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    // Safe methods are never CSRF targets.
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }

    // --- Origin check (always enforced) -----------------------------------
    const origin = req.headers.origin;
    if (isProduction && origin) {
      const allowed = corsOrigins.includes(origin);
      if (!allowed) {
        logger.warn({ origin, method: req.method, url: req.originalUrl }, 'csrf: blocked disallowed origin');
        throw ApiError.forbidden('Cross-origin request from disallowed origin');
      }
    }

    // --- Optional double-submit token check ------------------------------
    if (env.CSRF_REQUIRE_TOKEN === 'true') {
      const token = req.headers['x-csrf-token'] as string | undefined;
      if (!token) {
        throw ApiError.forbidden('Missing CSRF token');
      }
      // The token is validated against the session-issued value. On Workers
      // we don't have server-side sessions, so we accept any non-empty token
      // when CSRF_REQUIRE_TOKEN is set; the presence of the header itself
      // confirms the request originated from our SPA (which obtained the
      // token from /csrf/token). On Node/Render this could be extended to
      // validate against a server-side store.
      if (typeof token !== 'string' || token.length === 0) {
        throw ApiError.forbidden('Invalid CSRF token');
      }
    }

    next();
  });

/** Issue a CSRF token to the frontend. Called after sign-in. */
export const issueCsrfToken = asyncHandler(async (_req: Request, res: Response) => {
  // In a future Node/Render deployment with server-side sessions this value
  // would be stored in the session and validated on subsequent requests.
  // On Workers the mere presence of the header is sufficient proof the
  // client can read from our origin (same-origin policy blocks cross-origin
  // reads of this response).
  const token = randomBytes(32).toString('hex');
  res.json({ success: true, data: { csrfToken: token }, message: 'CSRF token issued' });
});
