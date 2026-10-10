import { SignJWT, importPKCS8 } from 'jose';
import { env } from '../config/env';
import { unmaskPrivateKey } from '../utils/credentials';
import { logger } from '../utils/logger';

/**
 * Minimal Firebase Auth admin operations over REST, for Cloudflare Workers.
 *
 * The Admin SDK performs these calls through Node's `http`/`https` client,
 * which workerd does not support for outbound requests. We instead mint a
 * Google OAuth2 access token from the service account with `jose` (RS256
 * assertion → token endpoint) and call the Identity Toolkit REST API directly
 * with `fetch`. Only the operations the API actually needs are implemented.
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1';

// Scopes required for Firebase Auth admin operations.
const SCOPES = [
  'https://www.googleapis.com/auth/identitytoolkit',
  'https://www.googleapis.com/auth/firebase',
].join(' ');

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

/** Mint (or reuse) a Google OAuth2 access token for the service account. */
async function getGoogleAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = env.FIREBASE_PRIVATE_KEY;
  if (!clientEmail || !privateKeyRaw) {
    return null;
  }

  const privateKey = unmaskPrivateKey(privateKeyRaw) ?? privateKeyRaw;
  const key = await importPKCS8(privateKey, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SCOPES })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(GOOGLE_TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  if (!res.ok) {
    logger.error(
      { status: res.status, body: await res.text().catch(() => '') },
      'Failed to mint Google access token for Firebase admin REST call',
    );
    return null;
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

/**
 * Revoke a customer's refresh tokens (full sign-out) via the Identity Toolkit
 * `accounts:update` endpoint with `validSince = now`. Mirrors
 * `adminAuth.revokeRefreshTokens()`.
 */
export async function revokeFirebaseRefreshTokens(uid: string): Promise<void> {
  const projectId = env.FIREBASE_PROJECT_ID;
  const token = await getGoogleAccessToken();
  if (!projectId || !token) {
    throw new Error('Firebase admin credentials are not available for token revocation');
  }

  const res = await fetch(`${IDENTITY_TOOLKIT_URL}/projects/${projectId}/accounts:update`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ localId: uid, validSince: Math.floor(Date.now() / 1000) }),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to revoke Firebase refresh tokens (${res.status}): ${await res
        .text()
        .catch(() => '')}`,
    );
  }
}
