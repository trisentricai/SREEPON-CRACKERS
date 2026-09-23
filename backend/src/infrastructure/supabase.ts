import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface SupabaseClaims extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: Record<string, unknown> & { roles?: string[] };
  user_metadata?: Record<string, unknown>;
}

/**
 * Supabase client configured with the service role key — used ONLY server-side
 * for admin provisioning and management. Never exposed to the frontend.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn('Supabase service role not configured — admin management endpoints will fail closed');
    return null;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const projectRefPattern = /^https:\/\/([a-z0-9-]+)\.supabase\.co$/;

/**
 * JWKS client used to verify Supabase-issued access tokens without making a
 * network call per request (keys are cached by jose).
 */
function getSupabaseJwks() {
  const match = env.SUPABASE_URL?.match(projectRefPattern);
  if (!match?.[1]) return null;
  const jwksUri = `https://${match[1]}.supabase.co/auth/v1/.well-known/jwks.json`;
  return createRemoteJWKSet(new URL(jwksUri));
}

/**
 * Verify a Supabase access token. Returns the decoded claims or null.
 * The backend never trusts frontend claims — it re-verifies the signature.
 */
export async function verifySupabaseToken(token: string): Promise<SupabaseClaims | null> {
  const jwks = getSupabaseJwks();
  if (!jwks) {
    logger.warn('Supabase is not configured — admin token verification will fail closed');
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${new URL(env.SUPABASE_URL!).host}/auth/v1`,
      audience: 'authenticated',
    });
    return payload as SupabaseClaims;
  } catch (err) {
    logger.debug({ err, component: 'supabase' }, 'Supabase token verification failed');
    return null;
  }
}