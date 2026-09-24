import { z } from 'zod';

/**
 * TypeScript mirror of the SriPon backend API surface for the customer
 * website. Source of truth is `backend/src/modules/*` (controllers/services)
 * and the OpenAPI contract in `docs/api.md`. Money is serialized as 2dp
 * strings; IDs are UUIDs.
 */

/** Error codes the backend returns on the envelope `code` field. */
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
  errors?: Record<string, string[]>;
  code?: ApiErrorCode;
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export type ProductUnit = 'BOX' | 'PACKET' | 'SINGLE' | 'OTHER';
export type CartUnit = 'BOX' | 'PACKET' | 'SINGLE';

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'featured' | 'name_asc';

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  displayOrder: number;
}

export interface InventoryRef {
  quantity: number;
  lowStockThreshold: number;
}

/** A product as returned by the public catalog. */
export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  basePrice: string;
  mrpPrice: string | null;
  sku: string;
  unit: ProductUnit;
  piecesPerBox: number | null;
  weightPerBox: string | null;
  minimumAge: number | null;
  isActive: boolean;
  isFeatured: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  category: CategoryRef | null;
  images: ProductImage[];
  inventory: InventoryRef | null;
}

export interface ProductListResponse {
  items: Product[];
  pagination: Pagination;
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  bannerImageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  productCount: number;
}

/** Nested category tree returned by `/categories/tree`. */
export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

/** Category detail returned by `/categories/:slug`. */
export interface CategoryDetail extends Omit<Category, 'productCount'> {
  productCount: number;
  children: CategoryRef[];
}

/* ------------------------------------------------------------------ */
/* Banners + homepage                                                  */
/* ------------------------------------------------------------------ */

export type BannerPlacement =
  | 'HOME_HERO'
  | 'HOME_SECONDARY'
  | 'HOME_MIDDLE'
  | 'HOME_BOTTOM'
  | 'CATEGORY_TOP'
  | 'PRODUCT_PROMOTION'
  | 'APP_HOME';

export type BannerActionType = 'LINKED_PRODUCT' | 'LINKED_CATEGORY' | 'CUSTOM_URL';

export interface BrandBanner {
  id: string;
  placement: BannerPlacement;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  actionType: BannerActionType;
  actionTarget: string | null;
  category: CategoryRef | null;
  displayOrder: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type HomepageSectionType =
  | 'HERO'
  | 'CATEGORY_GRID'
  | 'PRODUCT_CAROUSEL'
  | 'FEATURED_PRODUCTS'
  | 'BEST_SELLERS'
  | 'NEW_ARRIVALS'
  | 'PROMOTION'
  | 'CUSTOM_COLLECTION';

/** Compact product card data used inside homepage sections. */
export interface HomepageProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  unit: ProductUnit;
  basePrice: string;
  mrpPrice: string | null;
  shortDescription: string | null;
  minimumAge: number | null;
  category: CategoryRef;
  image: string | null;
  imageAlt: string | null;
}

/** Compact category card data used inside homepage sections. */
export interface HomepageCategory {
  id: string;
  name: string;
  slug: string;
  bannerImageUrl: string | null;
}

export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  title: string | null;
  config: Record<string, unknown> | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  content: {
    banners?: BrandBanner[];
    categories?: HomepageCategory[];
    products?: HomepageProduct[];
  };
}

export interface HomepageBannerGroup {
  placement: BannerPlacement;
  items: BrandBanner[];
}

export interface HomepageData {
  config: Record<string, unknown>;
  sections: HomepageSection[];
  banners: HomepageBannerGroup[];
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export interface PublicSettings {
  store: {
    name: string;
    tagline: string;
    supportEmail: string;
    supportPhone: string;
    currency: string;
    maintenanceMode: boolean;
  };
  delivery: {
    enabled: boolean;
    deliveryFee: string;
    freeShippingAbove: string | null;
    deliveryNote: string;
  };
  tax: {
    enabled: boolean;
    rate: number;
    gstin: string;
    taxInclusive: boolean;
  };
  social: {
    facebookUrl: string | null;
    instagramUrl: string | null;
    youtubeUrl: string | null;
    tiktokUrl: string | null;
    whatsappNumber: string | null;
  };
}

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

export interface CartItem {
  id: string;
  quantity: number;
  unit: CartUnit;
  availableStock: number;
  isOutOfStock: boolean;
  lineTotal: string;
  product: {
    id: string;
    name: string;
    slug: string;
    unit: ProductUnit;
    piecesPerBox: number | null;
    basePrice: string;
    mrpPrice: string | null;
    imageUrl: string | null;
  };
}

export interface Cart {
  id: string;
  currency: 'INR';
  items: CartItem[];
  subtotal: string;
  totalQuantity: number;
  itemCount: number;
  outOfStockCount: number;
}

export interface CartSummary {
  currency: 'INR';
  subtotal: string;
  totalQuantity: number;
  itemCount: number;
  outOfStockCount: number;
  outOfStockItems: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

/* ------------------------------------------------------------------ */
/* Wishlist                                                            */
/* ------------------------------------------------------------------ */

export interface WishlistItem {
  id: string;
  addedAt: string;
  isAvailable: boolean;
  availableStock: number;
  product: {
    id: string;
    name: string;
    slug: string;
    unit: ProductUnit;
    piecesPerBox: number | null;
    basePrice: string;
    mrpPrice: string | null;
    imageUrl: string | null;
  };
}

/* ------------------------------------------------------------------ */
/* Addresses                                                           */
/* ------------------------------------------------------------------ */

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  isDefault?: boolean;
}

/** Address payload accepted by order creation (inline or saved). */
export interface OrderAddressInput {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

export type PaymentStatusValue =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  productSlug: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  imageUrl: string | null;
}

export interface OrderPayment {
  id: string;
  provider: string;
  amount: string;
  status: PaymentStatusValue;
  providerRefId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface OrderReturnRequest {
  id: string;
  productId: string | null;
  reason: string;
  status: string;
  refundAmount: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatusValue;
  currency: string;
  subtotal: string;
  discount: string;
  tax: string;
  deliveryFee: string;
  grandTotal: string;
  coupon: { id: string; code: string } | null;
  address: OrderAddressInput | null;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { email: string; name: string | null } | null;
  items: OrderItem[];
  payments: OrderPayment[];
  returnRequests: OrderReturnRequest[];
}

export interface OrderListResponse {
  items: Order[];
  pagination: Pagination;
}

export interface CreateOrderInput {
  address?: OrderAddressInput;
  addressId?: string;
  couponCode?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  order: Order;
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export type PaymentProvider = 'razorpay' | 'stripe' | 'mock' | 'cash';

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  amount: string;
  status: PaymentStatusValue;
  providerRefId: string | null;
  paidAt: string | null;
  createdAt: string;
  /** Present only on `POST /payments` for gateway hand-offs. */
  clientPayload?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export interface PublicProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

/* ------------------------------------------------------------------ */
/* Validation helpers for query params                                 */
/* ------------------------------------------------------------------ */

export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const productQueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  category: z.string().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'featured', 'name_asc']).optional(),
});