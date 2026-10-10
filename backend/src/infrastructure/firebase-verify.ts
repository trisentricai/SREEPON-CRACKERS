import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env';

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
 * checks that matter for authenticity. (Node/Render keeps using the Admin SDK,
 * including its revocation checking.)
 *
 * Note: this path intentionally does not perform a token-revocation lookup.
 * Revocation (`checkRevoked`) needs an authenticated Identity Toolkit call that
 * itself depends on Node's HTTP client, so it is unavailable on Workers —
 * revoked sessions remain valid until the ID token expires (≤1 hour). Refresh
 * tokens are still revoked server-side on logout (see firebase-rest.ts).
 */

const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

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

/**
 * Verify a Firebase ID token's RS256 signature and standard claims using
 * Google's public JWKS. Throws when the token is invalid, expired, or was
 * issued for another Firebase project.
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
