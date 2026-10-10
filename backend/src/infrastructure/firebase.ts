import type { Auth } from 'firebase-admin/auth';
import { env } from '../config/env';
import { resolveFirebaseCredential } from '../utils/credentials';
import { logger } from '../utils/logger';

let auth: Auth | null = null;
let initialized = false;

/**
 * Initialize the Firebase Admin SDK from environment configuration.
 * Called lazily so the server can boot before Firebase is configured.
 *
 * The Admin SDK is loaded with a dynamic `require` inside this function: it is
 * not supported on Cloudflare Workers, but the API must still boot there — when
 * the SDK cannot load, customer-auth endpoints fail closed exactly as they do
 * when Firebase is unconfigured.
 */
export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  if (initialized) return null;

  const cred = resolveFirebaseCredential(
    env.FIREBASE_PROJECT_ID,
    env.FIREBASE_CLIENT_EMAIL,
    env.FIREBASE_PRIVATE_KEY,
    env.FIREBASE_SERVICE_ACCOUNT_PATH,
  );

  if (!cred) {
    logger.warn(
      'Firebase is not configured — customer authentication endpoints will fail closed',
    );
    initialized = true;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firebaseApp = require('firebase-admin/app') as typeof import('firebase-admin/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firebaseAuth = require('firebase-admin/auth') as typeof import('firebase-admin/auth');

    if (firebaseApp.getApps().length === 0) {
      if (cred.type === 'file') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(cred.path) as object;
        firebaseApp.initializeApp({ credential: firebaseApp.cert(serviceAccount) });
      } else {
        firebaseApp.initializeApp({
          credential: firebaseApp.cert({
            projectId: cred.projectId,
            clientEmail: cred.clientEmail,
            privateKey: cred.privateKey,
          }),
        });
      }
    }
    auth = firebaseAuth.getAuth();
    logger.info({ projectId: env.FIREBASE_PROJECT_ID }, 'Firebase Admin initialized');
  } catch (err) {
    logger.error({ err, component: 'firebase' }, 'Firebase Admin initialization failed; auth will fail closed');
    initialized = true;
  }

  return auth;
}