import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { env } from '../config/env';
import { resolveFirebaseCredential } from '../utils/credentials';
import { logger } from '../utils/logger';

let auth: Auth | null = null;
let initialized = false;

/**
 * Initialize the Firebase Admin SDK from environment configuration.
 * Called lazily so the server can boot before Firebase is configured.
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
    if (getApps().length === 0) {
      if (cred.type === 'file') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(cred.path) as object;
        initializeApp({ credential: cert(serviceAccount) });
      } else {
        initializeApp({
          credential: cert({
            projectId: cred.projectId,
            clientEmail: cred.clientEmail,
            privateKey: cred.privateKey,
          }),
        });
      }
    }
    auth = getAuth();
    logger.info({ projectId: env.FIREBASE_PROJECT_ID }, 'Firebase Admin initialized');
  } catch (err) {
    logger.error({ err, component: 'firebase' }, 'Firebase Admin initialization failed; auth will fail closed');
    initialized = true;
  }

  return auth;
}