import { z } from 'zod';

/**
 * Shared API envelope + domain types. These mirror the OpenAPI contract in
 * `backend/src/config/swagger.ts` (single source of truth in docs/api.md).
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

export const moneySchema = z.string().or(z.number());

export const MediaAssetSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  secureUrl: z.string().url(),
  resourceType: z.enum(['image', 'video', 'raw']),
  width: z.number().nullable(),
  height: z.number().nullable(),
  alt: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export interface MediaAsset {
  id: string;
  publicId: string;
  secureUrl: string;
  resourceType: 'image' | 'video' | 'raw';
  width: number | null;
  height: number | null;
  alt?: string | null;
  sortOrder: number;
}

export type Money = string | number;

/** Mina Money Amount as returned by the backend (DECIMAL stored as string). */
export interface MoneyAmount {
  amount: Money;
  currency: 'INR';
}

/* ------------------------------------------------------------------ */
/* Product                                                             */
/* ------------------------------------------------------------------ */
export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  sku: string;
  shortDescription?: string | null;
  category: { id: string; name: string; slug: string } | null;
  mrp: Money;
  sellingPrice: Money;
  discount: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNew?: boolean;
  image?: MediaAsset | null;
  images?: MediaAsset[];
  stockQuantity?: number;
  averageRating?: number;
  reviewCount?: number;
}

export interface Product extends ProductSummary {
  description?: string | null;
  brand?: string | null;
  productCode?: string | null;
  highlights?: string[];
  specifications?: Record<string, string>;
  tax?: number;
  stockQuantity: number;
  minimumOrderQuantity?: number;
  maximumOrderQuantity?: number;
  weight?: number | null;
  unit?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Structured page types                                               */
/* ------------------------------------------------------------------ */
export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  desktopImage: MediaAsset;
  mobileImage?: MediaAsset | null;
  ctaText?: string | null;
  actionType: 'LINKED_PRODUCT' | 'LINKED_CATEGORY' | 'CUSTOM_URL';
  target: string | null;
  placement: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: MediaAsset | null;
  banner?: MediaAsset | null;
  parentCategory?: CategorySummary | null;
  childCategories?: CategorySummary[];
  isActive?: boolean;
}

export interface FeatureCollection {
  id: string;
  title: string;
  subtitle?: string | null;
  type: string;
  products: ProductSummary[];
}

export interface HomepageData {
  banners: Banner[];
  categories: CategorySummary[];
  heroSections: Array<{ id: string; type: string; title: string | null; subtitle?: string | null; products?: ProductSummary[]; categories?: CategorySummary[] }>;
}