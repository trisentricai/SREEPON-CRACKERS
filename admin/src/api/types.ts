import type { ApiEnvelope, ApiErrorCode } from './http';

/**
 * Admin API types. These mirror the OpenAPI contract in
 * `backend/src/config/swagger.ts` (single source of truth in docs/api.md).
 * The backend wraps every response in `{ success, message, data }`.
 */

export type { ApiEnvelope, ApiErrorCode };

/** Money amounts are DECIMAL columns serialized as fixed 2dp strings. */
export type Money = string;

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */
export type ProductUnit = 'BOX' | 'PACKET' | 'SINGLE' | 'OTHER';

export interface ProductCategoryRef {
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

export interface ProductInventoryInfo {
  quantity: number;
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  basePrice: Money;
  mrpPrice: Money | null;
  sku: string;
  unit: ProductUnit;
  piecesPerBox: number | null;
  weightPerBox: Money | null;
  minimumAge: number | null;
  isActive: boolean;
  isFeatured: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  category: ProductCategoryRef | null;
  images: ProductImage[];
  inventory: ProductInventoryInfo | null;
}

export interface ProductListResponse {
  items: Product[];
  pagination: Pagination;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  sku: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string | null;
  basePrice: number | string;
  mrpPrice?: number | string;
  unit: ProductUnit;
  piecesPerBox?: number | null;
  weightPerBox?: number | string;
  isActive: boolean;
  isFeatured: boolean;
  minimumAge?: number | null;
  isApproved?: boolean;
  images?: Array<{ url: string; cloudinaryPublicId?: string; altText?: string }>;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  sku?: string;
  description?: string | null;
  shortDescription?: string | null;
  categoryId?: string | null;
  basePrice?: number | string;
  mrpPrice?: number | string | null;
  unit?: ProductUnit;
  piecesPerBox?: number | null;
  weightPerBox?: number | string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  minimumAge?: number | null;
  isApproved?: boolean;
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

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  bannerImageUrl?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  bannerImageUrl?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  displayOrder?: number;
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

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface OrderAddress {
  label?: string | null;
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  imageUrl: string | null;
}

export interface OrderPayment {
  id: string;
  provider: string;
  amount: Money;
  status: string;
  providerRefId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface OrderReturnRequest {
  id: string;
  productId: string;
  reason: string;
  status: string;
  refundAmount: Money | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  currency: string;
  subtotal: Money;
  discount: Money;
  tax: Money;
  deliveryFee: Money;
  grandTotal: Money;
  coupon: { id: string; code: string } | null;
  address: OrderAddress | null;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { email: string | null; name: string | null } | null;
  items: OrderItem[];
  payments: OrderPayment[];
  returnRequests: OrderReturnRequest[];
}

export interface OrderListResponse {
  items: OrderView[];
  pagination: Pagination;
}

export interface Invoice {
  invoiceNumber: string;
  issuedAt: string;
  order: OrderView;
}

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface CustomerListRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: UserStatus;
  isActive: boolean;
  orderCount: number;
  createdAt: string;
}

export interface CustomerListResponse {
  items: CustomerListRow[];
  pagination: Pagination;
}

export interface CustomerDetail {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: UserStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats: { orderCount: number; addressCount: number };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    grandTotal: Money;
    createdAt: string;
  }>;
}

export interface CustomerOrdersListResponse {
  customer: { id: string; name: string | null; email: string };
  items: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    grandTotal: Money;
    itemCount: number;
    createdAt: string;
  }>;
  pagination: Pagination;
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */
export interface InventoryItem {
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    unit: string;
    isActive: boolean;
    isApproved: boolean;
  };
  quantity: number;
  reservedQuantity: number;
  available: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  pagination: Pagination;
}

export type InventoryTransactionType =
  | 'STOCK_IN'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'RETURN'
  | 'CANCELLATION';

export interface InventoryTransaction {
  id: string;
  type: InventoryTransactionType;
  delta: number;
  note: string | null;
  orderId: string | null;
  admin: { id: string; name: string | null; email: string | null } | null;
  createdAt: string;
}

export interface InventoryTransactionsResponse {
  product: { id: string; name: string; sku: string };
  items: InventoryTransaction[];
  pagination: Pagination;
}

/* ------------------------------------------------------------------ */
/* Coupons                                                             */
/* ------------------------------------------------------------------ */
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Coupon {
  id: string;
  code: string;
  type: DiscountType;
  value: Money;
  maxDiscount: Money | null;
  minOrderValue: Money | null;
  usageLimit: number | null;
  perUserLimit: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CouponListResponse {
  items: Coupon[];
  pagination: Pagination;
}

export interface CreateCouponInput {
  code: string;
  type: DiscountType;
  value: number;
  maxDiscount?: number;
  minOrderValue?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
}

export interface UpdateCouponInput {
  code?: string;
  type?: DiscountType;
  value?: number;
  maxDiscount?: number;
  minOrderValue?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
}

/* ------------------------------------------------------------------ */
/* Banners                                                             */
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

export interface Banner {
  id: string;
  placement: BannerPlacement;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  actionType: BannerActionType;
  actionTarget: string | null;
  category: ProductCategoryRef | null;
  displayOrder: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BannerListResponse {
  items: Banner[];
  pagination: Pagination;
}

export interface CreateBannerInput {
  placement: BannerPlacement;
  title: string;
  subtitle?: string;
  imageUrl: string;
  actionType: BannerActionType;
  actionTarget?: string;
  categoryId?: string;
  displayOrder?: number;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
}

export interface UpdateBannerInput {
  placement?: BannerPlacement;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  actionType?: BannerActionType;
  actionTarget?: string;
  categoryId?: string;
  displayOrder?: number;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */
export interface StoreSettings {
  name: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  maintenanceMode: boolean;
}

export interface DeliverySettings {
  enabled: boolean;
  deliveryFee: Money;
  freeShippingAbove: Money | null;
  deliveryNote: string;
}

export interface TaxSettings {
  enabled: boolean;
  rate: number;
  gstin: string;
  taxInclusive: boolean;
}

export interface SocialSettings {
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  whatsappNumber: string | null;
}

export interface LegalPage {
  title: string;
  body: string;
}

export interface LegalSettings {
  policies: Record<string, LegalPage>;
  notices: LegalPage[];
}

export interface SettingsView {
  store: StoreSettings;
  delivery: DeliverySettings;
  tax: TaxSettings;
  social: SocialSettings;
  legal: LegalSettings;
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */
export interface DashboardMetrics {
  revenue: Money;
  paidOrders: number;
  averageOrderValue: Money;
  totalOrders: number;
  customers: number;
  newCustomersLast30Days: number;
  activeProducts: number;
  pendingOrdersCount: number;
  outOfStockCount: number;
  lowStockCount: number;
}

export interface RevenuePoint {
  day: string;
  revenue: Money;
  orders: number;
}

export interface OrdersPoint {
  day: string;
  orders: number;
  paid: number;
  unpaid: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  units: number;
  revenue: Money;
}

export interface CategoryPerformance {
  categoryId: string;
  name: string;
  slug: string;
  units: number;
  revenue: Money;
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */
export interface SignedUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  resourceType: 'image';
  signature: string;
}