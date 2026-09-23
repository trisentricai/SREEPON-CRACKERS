# SriPon — Database Design

Primary datastore: **PostgreSQL via Supabase**, accessed through **Prisma**.

> **Phase 1 note:** `backend/prisma/schema.prisma` currently contains a minimal
> `Phase1Placeholder` model so `prisma generate` works during scaffolding. The
> full production schema and the initial migration are introduced in Phase 2.

## Planned models

Each model maps to a Prisma model in a future migration. All primary keys are
`String @id @default(uuid())`; every row carries `createdAt`/`updatedAt`.

### Identity
- **User** — customers. `firebaseUid` (unique), `email`, `name`, `phone`,
  `isActive`, soft delete.
- **Admin** — dashboard operators. `supabaseUid` (unique), `email`, `name`,
  `role` (`OWNER | ADMIN | MANAGER | ANALYST` — see `backend/src/types/enums.ts`).

### Catalog
- **Category** — hierarchical tree. `name`, `slug` (unique), `parentId`,
  `displayOrder`, `bannerImageUrl`, `isActive`.
- **Product** — `name`, `slug`, `description`, `categoryId`, `basePrice`,
  `sku`, `unit`, `weight/boxSize` (shipment planning), `isActive`,
  `isFeatured`, `minimumAge`, `launchAvailability`, `isApproved`.
- **ProductImage** — ordered gallery, `productId`, `cloudinaryPublicId`,
  `url`, `altText`, `displayOrder`.

### Inventory
- **InventoryItem** — `productId` (1:1), `quantity`, `lowStockThreshold`,
  `reservedQuantity`, `lastAdjustedAt`.
- **InventoryTransaction** — audit of every stock movement: `type`
  (purchase/order/adjustment/return), `delta`, `note`, `adminId`.

### Shopper flows
- **Address** — one default per user. `label`, `fullName`, `phone`, address
  lines, `city`, `state`, `pincode`, `isDefault`.
- **Cart** — persists per user; merged after guest checkout.
- **CartItem** — `cartId`, `productId`, `quantity`, unit/box selection.
- **WishlistItem** — `userId`, `productId`.

### Commerce
- **Order** — `userId`, `orderNumber`, `status`
  (pending/payment_pending/confirmed/processing/shipped/delivered/cancelled),
  `paymentStatus`, `currency`, line-item totals, `subtotal`, `discount`,
  `tax`, `deliveryFee`, `grandTotal`, `couponId`, `addressSnapshot`,
  `notes`, `cancelledAt`, `deliveredAt`.
- **OrderItem** — snapshot of product, unit, price at purchase time.
- **Payment** — `orderId`, `provider`, `amount`, `status`, `providerRefId`,
  `webhookPayload` (encrypted at rest where required), `paidAt`.
- **ReturnRequest** — `orderId`, reason, status, refund tracking.
- **Coupon** — `code` (unique), `type` (percentage/fixed/free delivery),
  `amount`, `maxDiscount`, `minOrderValue`, `usageLimit`/`perUserLimit`,
  validity window, `isActive`.
- **CouponUsage** — redemption ledger fact.

### Content & engagement
- **Banner** — `placement`, `title`, `imageUrl`, `linkType`/`targetId`,
  `displayOrder`, `startAt`, `endAt`, `isActive`.
- **HomepageSection** — ordered sections, per-section configuration.
- **Notification** — `userId`, `type`, `title`, `body`, `data`, isRead.
- **DeviceToken** — FCM push targets per user.

### Platform
- **SiteSetting** — key/value for legal pages, safety notices, store settings.
- **AuditLog** — `actorType`, `actorId`, `action`, `resource`,
  changed fields, `requestId`, IP. Written for mutating admin calls.
- **RateLimitBucket** — only if Redis is unavailable (in-memory fallback).

## Conventions

- Money is stored as **integer minor units** or `Decimal` — never float.
- Price/stock reads are **backend-authoritative**; carts snapshot prices and
  are revalidated at checkout.
- Orders snapshot customer address and line items so historical print/invoice
  data is immutable.
- Row-level security in Supabase is configured so the API service role is the
  only role with write access from the backend; see `docs/supabase.md`.