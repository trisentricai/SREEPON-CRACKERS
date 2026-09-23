/** Static, non-secret application constants. */

export const APP = {
  name: 'SriPon',
  version: '1.0.0',
  apiVersion: 'v1',
} as const;

export const API_BASE = `/api/${APP.apiVersion}`;

/** Duration buckets for analytics date filters (in days). */
export const ANALYTICS_RANGES = {
  TODAY: 0,
  SEVEN_DAYS: 7,
  THIRTY_DAYS: 30,
  THREE_MONTHS: 90,
  SIX_MONTHS: 180,
  ONE_YEAR: 365,
} as const;

export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

/** Low-stock default threshold used by inventory reporting. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

/** Cache TTLs (seconds). */
export const CACHE_TTL = {
  PRODUCTS: 60,
  CATEGORIES: 300,
  BANNERS: 300,
  HOMEPAGE: 300,
} as const;