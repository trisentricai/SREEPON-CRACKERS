import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralized, validated environment configuration.
 * All secret values are optional in schema terms so the server can boot without
 * a fully configured environment — the code paths that require them fail closed.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  CORS_ORIGINS: z.string().default(''),
  JWT_SECRET: z.string().default(''),

  DATABASE_URL: z.string().default(''),
  DIRECT_DATABASE_URL: z.string().optional(),

  REDIS_URL: z.string().default(''),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),

  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  PAYMENT_PROVIDER: z.string().optional(),
  PAYMENT_MERCHANT_ID: z.string().optional(),
  PAYMENT_CLIENT_ID: z.string().optional(),
  PAYMENT_CLIENT_SECRET: z.string().optional(),
  PAYMENT_SALT_KEY: z.string().optional(),
  PAYMENT_WEBHOOK_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Shape the error so no secrets leak.
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  throw new Error(`Invalid environment configuration.\n${issues.join('\n')}`);
}

export const env = parsed.data;

/** Allowed browser origins (arrays are not passed straight to cors). */
export const corsOrigins: string[] = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/** True when the current environment is production. */
export const isProduction = env.NODE_ENV === 'production';

/** True when running automated tests. */
export const isTest = env.NODE_ENV === 'test';

export const isDev = env.NODE_ENV === 'development';