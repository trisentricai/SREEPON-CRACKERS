import { z } from 'zod';

// Cloudflare Workers has no local filesystem — the environment arrives via
// Worker bindings (copied into process.env by `src/worker-env.ts`), so dotenv
// must not run there. On Node (Render, tests, local dev) dotenv loads `.env`.
if (process.env.DEPLOY_TARGET !== 'workers') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv/config');
}

/**
 * Centralized, validated environment configuration.
 * All secret values are optional in schema terms so the server can boot without
 * a fully configured environment — the code paths that require them fail closed.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  /** Hosting platform marker: `''`/unset on Node, `'workers'` on Cloudflare. */
  DEPLOY_TARGET: z.string().default(''),

  CORS_ORIGINS: z.string().default(''),
  JWT_SECRET: z.string().default(''),

  DATABASE_URL: z.string().default(''),
  DIRECT_DATABASE_URL: z.string().optional(),

  REDIS_URL: z.string().default(''),

  // Upstash Redis REST credentials. Used on Cloudflare Workers, where raw TCP
  // Redis is unavailable (ioredis cannot open sockets); Node/Render keeps using
  // REDIS_URL. Both back the same narrow client surface (see infrastructure/redis).
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  // Redirect target for Firebase-generated password-reset links.
  FIREBASE_PASSWORD_RESET_URL: z.string().optional(),

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

  // Provider-specific payment credentials (providers fail closed when missing).
  PAYMENT_MOCK_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
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

/** True when running on Cloudflare Workers (not Node/Render). */
export const isWorkers = env.DEPLOY_TARGET === 'workers';

export const isDev = env.NODE_ENV === 'development';