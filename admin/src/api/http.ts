import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';

/**
 * SriPon admin API client.
 * One axios instance for the whole admin SPA: base URL from validated env, a
 * timeout, and an interceptor that attaches the Supabase access token for
 * authenticated requests. Response handling unwraps the `{ success, message,
 * data }` envelope so feature code never leaks an envelope into state.
 */

/** Error codes the backend may return on the envelope `code` field. */
export type ApiErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'unprocessable_entity'
  | 'rate_limited'
  | 'not_implemented'
  | 'server_error'
  | 'network_error';

/** Standard SriPon API response envelope `{ success, message, data }`. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  /** Present on 4xx validation errors: field -> human-readable messages. */
  errors?: Record<string, string[]>;
  /** Stable machine-readable error code (4xx/5xx only). */
  code?: ApiErrorCode;
}

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

export function createAdminApiClient(
  baseUrl: string,
  getToken: () => Promise<string | null>,
): AxiosInstance {
  const client = axios.create({
    baseURL: baseUrl,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });

  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiEnvelope<unknown>>) => {
      const status = error.response?.status ?? 0;
      const payload = error.response?.data;
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