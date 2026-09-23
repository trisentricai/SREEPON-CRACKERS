import { env } from '@/config/env';
import { getAuthToken } from '@/services/firebase';
import { createApiClient } from './http';

/** The single API client used across the customer app. */
export const api = createApiClient(env.VITE_API_BASE_URL, getAuthToken);