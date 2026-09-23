import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/config/env';

/**
 * Supabase admin client.
 * The backend re-verifies the JWT on every protected call — this browser
 * client only ever holds the anon key (safe to ship); the service-role key is
 * server-only and must never appear in this bundle.
 */

let client: SupabaseClient | null = null;

/** Lazily create the single Supabase client. */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the admin env.',
    );
  }
  client = createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!);
  return client;
}

/** Small typed await for auth token resolution. */
export async function getAccessToken(): Promise<string | null> {
  const auth = getSupabaseClient().auth;
  const session = await auth.getSession();
  return session.data.session?.access_token ?? null;
}