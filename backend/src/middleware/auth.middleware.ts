import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getFirebaseAuth } from '../infrastructure/firebase';
import { getSupabaseAdmin, verifySupabaseToken, type SupabaseClaims } from '../infrastructure/supabase';
import { ADMIN_ROLES, AdminRole } from '../types/enums';
import { ApiError, asyncHandler } from '../utils/http';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Verified Firebase identity (customer or app user). */
      user?: DecodedIdToken;
      /** Verified Supabase claims (admin). */
      admin?: SupabaseClaims;
    }
  }
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Require a valid Firebase ID token (customer / mobile app).
 * Fails closed when Firebase is not configured.
 */
export const requireFirebase = (): RequestHandler =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      throw ApiError.unauthorized('Missing bearer token');
    }
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      throw ApiError.serviceUnavailable('Firebase authentication is not configured on this server');
    }
    try {
      const decoded = await firebaseAuth.verifyIdToken(token, true);
      req.user = decoded;
      next();
    } catch (err) {
      logger.warn({ err, component: 'auth' }, 'Firebase token verification failed');
      throw ApiError.unauthorized('Invalid or expired token');
    }
  });

/**
 * Require a valid Supabase access token (admin dashboard).
 * The backend re-verifies the JWT signature — it never trusts the frontend.
 */
export const requireSupabase = (): RequestHandler =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      throw ApiError.unauthorized('Missing bearer token');
    }
    const claims = await verifySupabaseToken(token);
    if (!claims?.sub) {
      throw ApiError.unauthorized('Invalid or expired token');
    }
    req.admin = claims;
    next();
  });

/**
 * Role-based authorization. The role is resolved from the verified token
 * claims (app_metadata.roles for Supabase admins), never from the client.
 * When a token lacks a role (e.g. issued before a role change), the current
 * role is fetched authoritatively from the Supabase admin API instead.
 */
export const requireAdminRoles = (...roles: AdminRole[]): RequestHandler =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const claims = req.admin;
    if (!claims) {
      throw ApiError.unauthorized('Admin authentication required');
    }

    // Prefer any roles present in the token's app_metadata.
    const tokenRole = claims.app_metadata?.roles?.[0] as AdminRole | undefined;
    let appRole =
      tokenRole && (ADMIN_ROLES as readonly string[]).includes(tokenRole) ? tokenRole : undefined;

    // Stale-token fallback: pull the current role from Supabase. Tokens are
    // valid for ~1h and carry the app_metadata snapshot from when they were
    // issued, so a role change can leave old sessions claiming no role.
    if (!appRole) {
      const adminClient = getSupabaseAdmin();
      if (adminClient) {
        const { data: profile } = await adminClient.auth.admin.getUserById(claims.sub);
        const profileRole = profile?.user?.app_metadata?.roles?.[0] as AdminRole | undefined;
        if (profileRole && (ADMIN_ROLES as readonly string[]).includes(profileRole)) {
          appRole = profileRole;
        }
      }
    }

    if (!appRole) {
      logger.warn(
        { adminId: claims.sub, email: claims.email },
        'Denied admin access: no recognized role in token claims or admin profile',
      );
      throw ApiError.forbidden('No admin role assigned to this account');
    }

    if (!roles.includes(appRole)) {
      throw ApiError.forbidden(
        `Requires one of: ${roles.join(', ')} (your role: ${appRole as string})`,
      );
    }

    req.admin = { ...claims, app_metadata: { ...claims.app_metadata, roles: [appRole] } };
    next();
  });

/** Allowlist of authorized admin roles (exported for route registration). */
export { AdminRole };