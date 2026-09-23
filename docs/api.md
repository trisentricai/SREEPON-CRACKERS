# SriPon — API Reference

Base URL (production placeholder): `https://api.sripon.example/api/v1`

Local development: `http://localhost:5000/api/v1`

## Common contract

Every response is a JSON envelope:

```jsonc
// success
{ "success": true, "data": { ... } }

// error (error middleware)
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",          // machine-readable
    "message": "Route not found", // human-readable
    "status": 404,                // HTTP status
    "requestId": "...",           // traceable (echoes X-Request-Id)
    "details": null               // optional validation errors
  }
}
```

- **Auth**: `Authorization: Bearer <token>`
  - Customers / mobile → Firebase ID token (verified via Firebase Admin)
  - Admins → Supabase access token (verified via Supabase JWKS)
- **Rate limiting**: Redis-backed limits on auth (`/auth/login`,
  `/auth/register`, `/auth/password/reset`) and checkout
  (`/cart/items`, `/orders`, `/payments`) routes.
- **Idempotency**: order/payment creation should accept an
  `X-Idempotency-Key` header (introduced with the commerce phase).
- **Pagination** (list endpoints, later phase): `?page=&limit=`.

## Meta endpoints (live in Phase 1)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | liveness/readiness + uptime, no secrets |
| GET | `/api` | API fingerprint/name/version |
| GET | `/api/openapi.json` | OpenAPI 3.0.3 document |
| GET | `/api/docs` | Swagger UI |
| GET | `/api/v1/ping` | route-table smoke check |

## Module routes

Phase progress: **Customer identity (Phase 3)**, **Shopper flows (Phase 4:
cart + wishlist)**, **Commerce (Phase 5: orders, payments, coupons)**,
**Content (Phase 6: banners + homepage)** and **Settings (Phase 7: store /
delivery / tax / social / legal storefront config)** ship live
Firebase/Supabase-backed endpoints; **Catalog (Phase 2)** ships live endpoints
(guarded, validated, pagination included). All other modules below are
registered and guarded, but return `501` until their phase ships.

### Identity — Phase 3 (implemented)
- `POST /auth/login` — verify Firebase ID token, find-or-create the local
  `User`, returns the customer profile (`201` when the profile is new)
- `POST /auth/register` — same bridge; safe to call again for an existing profile
- `POST /auth/password/reset` — Firebase password-reset email (generic `202`;
  never reveals whether an email exists)
- `POST /auth/logout` — revoke the customer's Firebase refresh tokens (`204`)
- `GET /auth/me` — current customer profile (+ `emailVerified` from the token)
- `GET /users/me`, `PATCH /users/me` — profile management (later phase)
- `GET /addresses`, `POST /addresses`, `GET /addresses/:id`,
  `PATCH /addresses/:id`, `DELETE /addresses/:id`,
  `PATCH /addresses/:id/default` (Firebase)
- Admin: `GET/POST /admins`, `GET/PATCH/DELETE /admins/:id` (Supabase)

### Catalog — Phase 2 (implemented)
- `GET /products` — public list (page/limit, `category` slug or id including
  descendants, `q`, `minPrice`/`maxPrice`, `featured`, `sort`)
- `GET /products/search` — same filtering with a required `q`
- `GET /products/slug/:slug`, `GET /products/:id` — published product detail
  (404 for inactive or unapproved products)
- `GET /categories`, `GET /categories/tree`, `GET /categories/:slug`
- Admin products (`SUPER_ADMIN | ADMIN | PRODUCT_MANAGER`):
  `POST /admin/products`, `PATCH /admin/products/:id`,
  `DELETE /admin/products/:id`, `PATCH /admin/products/:id/visibility`,
  `POST /admin/products/:id/images`,
  `PATCH|DELETE /admin/products/:id/images/:imageId`,
  `PATCH /admin/products/:id/images/reorder`
- Admin categories:
  `POST /admin/categories`, `PATCH /admin/categories/:id`,
  `DELETE /admin/categories/:id`, `PATCH /admin/categories/reorder`

### Shopper flows — Phase 4 (implemented)
- Cart: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:itemId`,
  `DELETE /cart/items/:itemId`, `DELETE /cart`, `POST /cart/merge`,
  `GET /cart/summary`
- Wishlist: `GET /wishlist`, `POST /wishlist/items`,
  `DELETE /wishlist/items/:productId`,
  `POST /wishlist/items/:productId/move-to-cart`

### Commerce — Phase 5 (implemented)
- Orders (customer, Firebase): `POST /orders`, `GET /orders`,
  `GET /orders/:id`, `POST /orders/:id/cancel`,
  `POST /orders/:id/return-request`, `GET /orders/:id/invoice`
  - Creation is transactional and backend-authoritative: prices are re-derived
    from the DB, stock is reserved atomically, and the address/ship-to is
    snapshotted immutably for invoicing; the cart is cleared on success and a
    coupon (optional) is written to the redemption ledger.
  - Cancel is allowed for unpaid (PENDING/CONFIRMED/PROCESSING) orders and
    releases reserved stock; returns are only requestable once DELIVERED.
  - Invoices are immutable snapshots (`invoiceNumber` mirrors `orderNumber`).
- Orders (admin, Supabase): `GET /admin/orders`,
  `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`,
  `PATCH /admin/orders/:id/payment-status`,
  `POST /admin/orders/:id/notes`, `GET /admin/orders/:id/invoice`
  - Status advances along a validation map (e.g. CONFIRMED sells stock,
    CANCELLED releases/restocks, RETURNED restocks) and every change writes an
    `AuditLog` row; admin notes are appended timestamped to `order.notes`.
- Payments: `POST /payments`, `GET /payments/:id` (Firebase),
  `POST /payments/webhooks/:provider` (webhook, provider-signed)
  - Providers: `razorpay`, `stripe`, `mock`, `cash`. Amounts come only from the
    stored order `grandTotal`; an in-flight PENDING payment is re-used instead
    of creating a duplicate intent.
  - A provider webhook — verified by HMAC signature over the raw request body —
    is the only thing that marks a payment (and its order) PAID or FAILED.
    Unconfigured gateways fail closed (`503`).
- Coupons: `POST /coupons/validate` (Firebase);
  Coupon admin: `GET/POST /admin/coupons`, `GET/PATCH/DELETE /admin/coupons/:id`
  - Eligibility (window, minimum order value, usage limit, per-user limit) is
    enforced server-side for checkout and validation; `PERCENTAGE` discounts
    respect `maxDiscount`; codes are normalized uppercase.

### Content — Phase 6 (implemented)
- Banners: `GET /banners`, `GET /banners/:placement` (public);
  admin (`SUPER_ADMIN | ADMIN | CONTENT_MANAGER`):
  `GET/POST /admin/banners`, `GET/PATCH/DELETE /admin/banners/:id`,
  `POST /admin/banners/:id/duplicate`,
  `PATCH /admin/banners/:id/activate`, `PATCH /admin/banners/reorder`
  - Public reads only return banners that are active **and** inside their
    scheduled `startAt`/`endAt` window, ordered by placement/displayOrder.
  - `LINKED_CATEGORY` banners require a `categoryId`; other action types
    require an `actionTarget`. Duplicating creates an inactive copy; every
    create/update/delete/activate writes an `AuditLog` row (actor + request id).
- Homepage: `GET /homepage` (public) composes active sections (with their
  banners, products and categories resolved from live data), groups active
  banners by placement, and merges the `SiteSetting`-backed homepage config.
  Admin (`SUPER_ADMIN | ADMIN | CONTENT_MANAGER`):
  `GET /admin/homepage`, `PUT /admin/homepage` (upserts the `homepage` config),
  `GET /admin/homepage/sections`, `POST /admin/homepage/sections`,
  `PATCH /admin/homepage/sections/reorder`,
  `PATCH /admin/homepage/sections/:id`, `DELETE /admin/homepage/sections/:id`
  - Section types: `HERO`, `CATEGORY_GRID`, `PRODUCT_CAROUSEL`,
    `FEATURED_PRODUCTS`, `BEST_SELLERS` (by order-item quantity),
    `NEW_ARRIVALS`, `PROMOTION`, `CUSTOM_COLLECTION` (uses `config.productIds`).

### Engagement (Firebase)
- Notifications: `GET /notifications`,
  `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`,
  `GET /notifications/unread-count`,
  `POST /notifications/devices`, `DELETE /notifications/devices/:token`

### Ops
- Analytics (Supabase): `GET /admin/analytics/dashboard`,
  `GET /admin/analytics/revenue`, `GET /admin/analytics/orders`,
  `GET /admin/analytics/top-products`, `GET /admin/analytics/categories`
- Inventory (Supabase): `GET /admin/inventory`,
  `GET /admin/inventory/low-stock`,
  `POST /admin/inventory/:productId/adjust`,
  `GET /admin/inventory/:productId/transactions`
- Customers (Supabase): `GET /admin/customers`,
  `GET /admin/customers/:id`, `GET /admin/customers/:id/orders`
- Settings: `GET /settings/public`, `GET /settings/legal` (public);
  `GET /admin/settings`, `PATCH /admin/settings` (Supabase)

## Error codes

`BAD_REQUEST 400`, `UNAUTHORIZED 401`, `FORBIDDEN 403`, `NOT_FOUND 404`,
`UNPROCESSABLE 422` (validation), `RATE_LIMITED 429`,
`NOT_IMPLEMENTED 501`, `SERVICE_UNAVAILABLE 503`.

## Swagger

The OpenAPI document is generated at runtime
(`backend/src/config/swagger.ts`) and served at `/api/openapi.json`; Swagger UI
at `/api/docs`.