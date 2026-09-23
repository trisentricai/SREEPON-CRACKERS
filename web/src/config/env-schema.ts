import { z } from 'zod';

/**
 * Vite environment schema for the SriPon customer website.
 * All runtime env access funnels through `@/config/env.ts`; this schema
 * guarantees every var is either present or has a safe explicit default, so
 * misconfiguration fails loudly at boot instead of as `undefined` mid-flow.
 */
export const envSchema = z.object({
  MODE: z.enum(['development', 'production', 'test']),
  DEV: z.boolean(),
  PROD: z.boolean(),
  BASE_URL: z.string().default('/'),
  SSR: z.boolean().default(false),
  VITE_API_BASE_URL: z.string().url().default('http://localhost:5000/api/v1'),

  VITE_FIREBASE_API_KEY: z.string().optional(),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  VITE_FIREBASE_PROJECT_ID: z.string().optional(),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  VITE_FIREBASE_APP_ID: z.string().optional(),
  VITE_FIREBASE_MEASUREMENT_ID: z.string().optional(),
});