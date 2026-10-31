import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Cloudflare-Workers-compatible Firebase ID token verification.
 *
 * The Firebase Admin SDK verifies ID tokens by fetching Google's x509 signing
 * certificates through Node's `http`/`https` client. workerd implements
 * `node:http` only for *servers* (via the Express `httpServerAdapter`); outbound
 * client requests are unsupported. As a result `adminAuth.verifyIdToken()`
 * always throws on Workers and every authenticated customer request fails with
 * `401 Invalid or expired token`.
 *
 * We verify the same tokens with `jose` against Google's public JWKS for the
 * `securetoken` service account over a plain `fetch`, which Workers supports
 * natively. The signature, issuer, audience and expiry are all validated — the
 * checks that matter for authenticity.
 *
 * Token revocation: when `FIREBASE_CHECK_REVOCATION` is "true", we additionally
 * call the Firebase Identity Toolkit `accounts:lookup` API (over `fetch`,
 * Workers-compatible) to compare the token's `auth_time` (iat) against the
 * user's `validSince` timestamp. Tokens issued before `validSince` are revoked
 * and rejected. This adds ~1 network round-trip per authenticated request, so
 * it is opt-in via env var.
 */

const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const IDENTITY_TOOLKIT_LOOKUP_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

/** Process-cached remote JWK set (jose caches the fetched keys internally). */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
  }
  return jwks;
}

/** Firebase ID token claims (the subset the application relies on). */
export interface FirebaseIdTokenClaims extends JWTPayload {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  phone_number?: string;
  auth_time?: number;
}

/** Cache of user revocation state: uid -> validSince (ms since epoch). */
const revocationCache = new Map<string, { validSinceMs: number; fetchedAt: number }>();

/** Maximum age of a revocation cache entry before re-checking (5 minutes). */
const REVOCATION_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Look up a user's `validSince` timestamp from Firebase Identity Toolkit.
 * Returns `null` if the user doesn't exist or the lookup fails (fail open).
 */
async function lookupValidSinceMs(uid: string): Promise<number | null> {
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) {
    logger.warn('FIREBASE_API_KEY not configured; skipping revocation check');
    return null;
  }

  // Check cache first.
  const cached = revocationCache.get(uid);
  if (cached && Date.now() - cached.fetchedAt < REVOCATION_CACHE_TTL_MS) {
    return cached.validSinceMs;
  }

  try {
    const response = await fetch(`${IDENTITY_TOOLKIT_LOOKUP_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: uid, multiCredential: true }),
    });
    if (!response.ok) {
      logger.warn({ status: response.status, uid }, 'Identity Toolkit lookup failed');
      return null;
    }
    const data = (await response.json()) as { users?: Array<{ validSince?: string }> };
    const user = data.users?.[0];
    const validSinceMs = user?.validSince ? Number(user.validSince) : null;

    // Cache the result.
    if (validSinceMs != null) {
      revocationCache.set(uid, { validSinceMs, fetchedAt: Date.now() });
    }

    return validSinceMs;
  } catch (err) {
    logger.warn({ err, uid }, 'Identity Toolkit lookup error');
    return null;
  }
}

/**
 * Check whether a Firebase ID token is revoked by comparing its `auth_time`
 * (issued-at) against the user's `validSince` timestamp.
 *
 * Firebase updates `validSince` whenever tokens are revoked (e.g. password
 * change, logout, account deletion). Any ID token issued before `validSince`
 * is considered revoked and must be rejected.
 *
 * Returns `true` if the token is revoked, `false` if valid, `null` if the
 * check could not be performed (fail open).
 */
export async function checkTokenRevocation(token: string, uid: string): Promise<boolean | null> {
  // Decode the token payload without verification to read auth_time (iat).
  // We already verified the signature via jwtVerify, so the payload is trustworthy.
  let iat: number | undefined;
  try {
    const parts = token.split('.');
    const payloadB64 = parts[1];
    if (!payloadB64) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8')) as {
      iat?: number;
    };
    iat = payload.iat;
  } catch {
    return null;
  }

  if (typeof iat !== 'number') {
    return null;
  }

  const validSinceMs = await lookupValidSinceMs(uid);
  if (validSinceMs === null) {
    return null; // Fail open: can't check, allow the token
  }

  // validSince is in milliseconds; iat is in seconds.
  const tokenIssuedAtMs = iat * 1000;
  return tokenIssuedAtMs < validSinceMs;
}

/**
 * Verify a Firebase ID token's RS256 signature and standard claims using
 * Google's public JWKS. Throws when the token is invalid, expired, or was
 * issued for another Firebase project.
 *
 * When `FIREBASE_CHECK_REVOCATION` is "true", additionally checks token
 * revocation via the Identity Toolkit API. Revoked tokens are rejected with
 * a 401 Unauthorized error.
 */
export async function verifyFirebaseIdToken(token: string): Promise<FirebaseIdTokenClaims> {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Firebase project id (FIREBASE_PROJECT_ID) is not configured');
  }

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256'],
  });

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Firebase ID token is missing the subject (sub) claim');
  }

  // --- Revocation check (opt-in via FIREBASE_CHECK_REVOCATION) ------------
  if (env.FIREBASE_CHECK_REVOCATION === 'true') {
    const revoked = await checkTokenRevocation(token, payload.sub);
    if (revoked === true) {
      throw new Error('Firebase ID token has been revoked');
    }
    // revoked === null means we couldn't check; fail open and allow.
  }

  return {
    ...payload,
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    email_verified: typeof payload.email_verified === 'boolean' ? payload.email_verified : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    phone_number: typeof payload.phone_number === 'string' ? payload.phone_number : undefined,
    auth_time: typeof payload.auth_time === 'number' ? payload.auth_time : undefined,
  };
}
