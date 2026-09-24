import { z } from 'zod';

/**
 * Admin dashboard environment schema.
 * Same discipline as the customer web: every runtime env var is validated at
 * boot so misconfiguration fails loudly instead of surfacing as `undefined`.
 */
export const envSchema = z.object({
  MODE: z.enum(['development', 'production', 'test']),
  DEV: z.boolean(),
  PROD: z.boolean(),
  BASE_URL: z.string().default('/'),
  VITE_API_BASE_URL: z.string().url().default('https://sreepon-crackers.onrender.com/api/v1'),

  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  VITE_SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});