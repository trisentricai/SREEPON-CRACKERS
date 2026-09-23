/** Shared domain enums used across the SriPon API contract. */

export const AdminRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  PRODUCT_MANAGER: 'PRODUCT_MANAGER',
  ORDER_MANAGER: 'ORDER_MANAGER',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  ANALYST: 'ANALYST',
} as const;
export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

/** All admin roles, ordered by privilege (highest first). */
export const ADMIN_ROLES: readonly AdminRole[] = Object.values(AdminRole);

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURNED: 'RETURNED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ORDER_STATUSES: readonly OrderStatus[] = Object.values(OrderStatus);

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const InventoryTransactionType = {
  STOCK_IN: 'STOCK_IN',
  SALE: 'SALE',
  ADJUSTMENT: 'ADJUSTMENT',
  RETURN: 'RETURN',
  CANCELLATION: 'CANCELLATION',
} as const;
export type InventoryTransactionType =
  (typeof InventoryTransactionType)[keyof typeof InventoryTransactionType];

export const DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const BannerPlacement = {
  HOME_HERO: 'HOME_HERO',
  HOME_SECONDARY: 'HOME_SECONDARY',
  HOME_MIDDLE: 'HOME_MIDDLE',
  HOME_BOTTOM: 'HOME_BOTTOM',
  CATEGORY_TOP: 'CATEGORY_TOP',
  PRODUCT_PROMOTION: 'PRODUCT_PROMOTION',
  APP_HOME: 'APP_HOME',
} as const;
export type BannerPlacement = (typeof BannerPlacement)[keyof typeof BannerPlacement];

export const BannerActionType = {
  LINKED_PRODUCT: 'LINKED_PRODUCT',
  LINKED_CATEGORY: 'LINKED_CATEGORY',
  CUSTOM_URL: 'CUSTOM_URL',
} as const;
export type BannerActionType = (typeof BannerActionType)[keyof typeof BannerActionType];

export const HomepageSectionType = {
  HERO: 'HERO',
  CATEGORY_GRID: 'CATEGORY_GRID',
  PRODUCT_CAROUSEL: 'PRODUCT_CAROUSEL',
  FEATURED_PRODUCTS: 'FEATURED_PRODUCTS',
  BEST_SELLERS: 'BEST_SELLERS',
  NEW_ARRIVALS: 'NEW_ARRIVALS',
  PROMOTION: 'PROMOTION',
  CUSTOM_COLLECTION: 'CUSTOM_COLLECTION',
} as const;
export type HomepageSectionType =
  (typeof HomepageSectionType)[keyof typeof HomepageSectionType];

export const NotificationType = {
  ORDER: 'ORDER',
  PAYMENT: 'PAYMENT',
  PROMOTIONAL: 'PROMOTIONAL',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const AuditAction = {
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  STOCK_CHANGED: 'STOCK_CHANGED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  BANNER_CREATED: 'BANNER_CREATED',
  BANNER_UPDATED: 'BANNER_UPDATED',
  COUPON_CHANGED: 'COUPON_CHANGED',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  ADMIN_ROLE_CHANGED: 'ADMIN_ROLE_CHANGED',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const MediaResourceType = {
  IMAGE: 'image',
  VIDEO: 'video',
  RAW: 'raw',
} as const;
export type MediaResourceType = (typeof MediaResourceType)[keyof typeof MediaResourceType];