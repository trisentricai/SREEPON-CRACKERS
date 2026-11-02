import { SignJWT, importPKCS8 } from 'jose';
import { env } from '../../config/env';
import { prisma } from '../../infrastructure/prisma';
import { logger } from '../../utils/logger';

/**
 * Firebase Cloud Messaging (HTTP v1) for the admin mobile app.
 *
 * The admin app is a separate Firebase project (`admin-sreepon`) from the
 * storefront, so it needs its own service account:
 *
 *   FCM_ADMIN_PROJECT_ID
 *   FCM_ADMIN_CLIENT_EMAIL
 *   FCM_ADMIN_PRIVATE_KEY   (PEM, "\n" escapes allowed)
 *
 * When any of them is missing the function is a no-op, so order creation keeps
 * working with in-app notifications only.
 */

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cached: CachedToken | null = null;

export interface AdminPushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

function normalizePrivateKey(key: string): string {
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

function credentials() {
  const projectId = env.FCM_ADMIN_PROJECT_ID;
  const clientEmail = env.FCM_ADMIN_CLIENT_EMAIL;
  const privateKey = env.FCM_ADMIN_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey: normalizePrivateKey(privateKey) };
}

async function getAccessToken(): Promise<{ projectId: string; token: string } | null> {
  const creds = credentials();
  if (!creds) return null;

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return { projectId: creds.projectId, token: cached.accessToken };
  }

  const key = await importPKCS8(creds.privateKey, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(creds.clientEmail)
    .setSubject(creds.clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.error({ status: response.status, detail: detail.slice(0, 300) }, 'FCM OAuth token request failed');
    return null;
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) return null;

  cached = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };
  return { projectId: creds.projectId, token: cached.accessToken };
}

async function sendOne(
  projectId: string,
  accessToken: string,
  deviceToken: string,
  message: AdminPushMessage,
): Promise<'sent' | 'invalid' | 'failed'> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title: message.title, body: message.body },
          data: message.data ?? {},
          android: {
            priority: 'HIGH',
            notification: { channel_id: 'sreepon_admin', sound: 'default' },
          },
        },
      }),
      signal: AbortSignal.timeout(10000),
    },
  );

  if (response.ok) return 'sent';

  const detail = await response.text().catch(() => '');
  // UNREGISTERED / INVALID_ARGUMENT means the device token is stale.
  if (response.status === 404 || detail.includes('UNREGISTERED')) {
    return 'invalid';
  }
  logger.warn({ status: response.status, detail: detail.slice(0, 300) }, 'FCM send failed');
  return 'failed';
}

/**
 * Send a push notification to every supplied device token. Invalid tokens are
 * pruned from the database. Returns the number of messages delivered.
 */
export async function sendAdminPush(tokens: string[], message: AdminPushMessage): Promise<number> {
  if (tokens.length === 0) return 0;

  const auth = await getAccessToken().catch((err) => {
    logger.error({ err }, 'FCM auth failed');
    return null;
  });
  if (!auth) return 0;

  const results = await Promise.all(
    tokens.map(async (token) => {
      try {
        return { token, result: await sendOne(auth.projectId, auth.token, token, message) };
      } catch (err) {
        logger.warn({ err }, 'FCM send threw');
        return { token, result: 'failed' as const };
      }
    }),
  );

  const invalid = results.filter((r) => r.result === 'invalid').map((r) => r.token);
  if (invalid.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: invalid } } }).catch(() => undefined);
  }

  return results.filter((r) => r.result === 'sent').length;
}
