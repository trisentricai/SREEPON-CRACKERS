import { env } from '@/config/env';
import { getAccessToken } from '@/lib/supabase';
import { createAdminApiClient } from './http';

/** The single API client used across the admin dashboard. */
export const apiClient = createAdminApiClient(env.VITE_API_BASE_URL, getAccessToken);