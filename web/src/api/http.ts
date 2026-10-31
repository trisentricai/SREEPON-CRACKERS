import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiEnvelope, ApiErrorCode } from './types';
import { env } from '@/config/env';

/**
 * Sreepon web API client.
 * One axios instance for the whole single-page app: base URL from validated
 * env, a timeout, and an interceptor that attaches the Firebase ID token for
 * authenticated requests. Response handling unwraps the `{ success, message,
 * data }` envelope so feature code never leaks an envelope into state.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    options: { status?: number; code?: ApiErrorCode; fieldErrors?: Record<string, string[]> } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 500;
    this.code = options.code ?? 'server_error';
    this.fieldErrors = options.fieldErrors;
  }

  static fromResponse(payload: ApiEnvelope<unknown>, status: number): ApiError {
    // Normalize every non-2xx body into a typed ApiError regardless of how the
    // backend shaped it (field errors, single message, or raw transport error).
    return new ApiError(payload.message, {
      status,
      code: payload.code,
      fieldErrors: payload.errors,
    });
  }
}

/** CSRF token issued by the backend, sent on state-changing requests. */
let csrfToken: string | null = null;

/** Fetch a CSRF token from the backend (uses fetch directly to avoid axios recursion). */
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch(`${env.VITE_API_BASE_URL}/csrf/token`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: { csrfToken?: string } };
    return data.data?.csrfToken ?? null;
  } catch {
    return null;
  }
}

/** Set the CSRF token (called after fetching or on 403 refresh). */
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

/** Get the current CSRF token. */
export function getCsrfToken(): string | null {
  return csrfToken;
}

export interface RequestContext {
  /** Attach the authenticated customer's Firebase ID token. */
  token?: string;
  /** Arbitrary headers merged into the request (e.g. X-Idempotency-Key). */
  headers?: Record<string, string>;
}

// First-login race: authenticated queries can beat the POST /auth/login bridge
// that find-or-creates the backend User row. On a "profile not found" 401 we
// run the bridge once and retry the original request.
type RetriableConfig = InternalAxiosRequestConfig & { _profileBridgeRetried?: boolean; _csrfRetried?: boolean };

export function createApiClient(baseUrl: string, getToken: () => Promise<string | null>): AxiosInstance {
  const client = axios.create({
    baseURL: baseUrl,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });

  const isStateChanging = (method: string | undefined) =>
    ['post', 'patch', 'put', 'delete'].includes(method?.toLowerCase() ?? '');

  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Attach CSRF token on state-changing requests when CSRF protection is enabled.
    if (isStateChanging(config.method)) {
      const csrf = getCsrfToken();
      if (csrf) config.headers['X-CSRF-Token'] = csrf;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiEnvelope<unknown>>) => {
      const status = error.response?.status ?? 0;
      const payload = error.response?.data;
      const config = error.config as RetriableConfig | undefined;

      // CSRF token rejected: fetch a new one and retry once.
      if (
        status === 403 &&
        payload &&
        typeof payload.message === 'string' &&
        payload.message.toLowerCase().includes('csrf') &&
        config &&
        !config._csrfRetried
      ) {
        config._csrfRetried = true;
        const newToken = await fetchCsrfToken();
        if (newToken) {
          setCsrfToken(newToken);
          config.headers['X-CSRF-Token'] = newToken;
          return client(config);
        }
      }

      if (
        status === 401 &&
        payload &&
        typeof payload.message === 'string' &&
        payload.message.toLowerCase().includes('profile not found') &&
        config &&
        !config._profileBridgeRetried
      ) {
        const idToken = await getToken();
        if (idToken) {
          config._profileBridgeRetried = true;
          try {
            await client.post('/auth/login', { idToken });
          } catch {
            // Bridge failed; fall through and surface the original error.
          }
          return client(config);
        }
      }

      if (payload && typeof payload.message === 'string') {
        return Promise.reject(ApiError.fromResponse(payload, status));
      }
      // Network error / timeout / no body.
      return Promise.reject(
        new ApiError(error.code === 'ECONNABORTED' ? 'Request timed out' : 'Network error', {
          status: 0,
          code: 'network_error',
        }),
      );
    },
  );

  return client;
}
