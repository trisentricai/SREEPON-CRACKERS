import { envSchema } from './env-schema';

/**
 * Validated runtime configuration for the SriPon admin dashboard.
 */
export const env = envSchema.parse(import.meta.env);

/** Supabase is usable only when URL + anon key are provided. */
export const isSupabaseConfigured = Boolean(
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY,
);