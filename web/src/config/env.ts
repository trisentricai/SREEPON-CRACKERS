import { envSchema } from './env-schema';

/**
 * Validated runtime configuration for the SriPon customer website.
 * Every env access in the app goes through this export.
 */
export const env = envSchema.parse(import.meta.env);

export const SITE = {
  name: 'SriPon',
  tagline: 'Celebrate responsibly',
  baseUrl: 'https://www.sripon.example', // replaced by a real domain in deployment
  currency: 'INR',
} as const;

/** Firebase is considered configured only when all mandatory keys exist. */
export const isFirebaseConfigured = Boolean(
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID,
);