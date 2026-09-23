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

## Module routes (Phase 1 = 501 Not Implemented)

All endpoints below are **registered** and guarded correctly, but return
`501` with `"code": "NOT_IMPLEMENTED"` until their phase ships.

### Identity
- `POST /auth/login`, `POST /auth/register`, `POST /auth/password/reset`,
  `GET /auth/me`
- `GET /users/me`
- `GET /addresses`, `POST /addresses`, `GET /addresses/:id`,
  `PATCH /addresses/:id`, `DELETE /addresses/:id`,
  `PATCH /addresses/:id/default` (Firebase)
- Admin: `GET/POST /admins`, `GET/PATCH/DELETE /admins/:id` (Supabase)

### Catalog
- `GET /products`, `GET /products/search`, `GET /products/slug/:slug`,
  `GET /products/:id`
- `GET /categories`, `GET /categories/tree`, `GET /categories/:slug`
- Admin: `POST /admin/products`, `PATCH /admin/products/:id`,
  `DELETE /admin/products/:id`, `PATCH /admin/products/:id/visibility`,
  `POST /admin/products/:id/images`,
  `PATCH|DELETE /admin/products/:id/images/:imageId`,
  `PATCH /admin/products/:id/images/reorder`
- Admin categories: `POST /admin/categories`,
  `PATCH /admin/categories/:id`, `DELETE /admin/categories/:id`,
  `PATCH /admin/categories/reorder`

### Shopper flows (Firebase)
- Cart: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:itemId`,
  `DELETE /cart/items/:itemId`, `DELETE /cart`, `POST /cart/merge`,
  `GET /cart/summary`
- Wishlist: `GET /wishlist`, `POST /wishlist/items`,
  `DELETE /wishlist/items/:productId`,
  `POST /wishlist/items/:productId/move-to-cart`

### Commerce
- Orders (customer, Firebase): `POST /orders`, `GET /orders`,
  `GET /orders/:id`, `POST /orders/:id/cancel`,
  `POST /orders/:id/return-request`, `GET /orders/:id/invoice`
- Orders (admin, Supabase): `GET /admin/orders`,
  `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`,
  `PATCH /admin/orders/:id/payment-status`,
  `POST /admin/orders/:id/notes`, `GET /admin/orders/:id/invoice`
- Payments: `POST /payments`, `GET /payments/:id` (Firebase),
  `POST /payments/webhooks/:provider` (webhook, provider-signed)
- Coupons: `POST /coupons/validate` (Firebase);
  Coupon admin: `GET/POST /admin/coupons`, `GET/PATCH/DELETE /admin/coupons/:id`

### Content (admin, Supabase — read routes public)
- Banners: `GET /banners`, `GET /banners/:placement` (public);
  `GET/POST /admin/banners`, `GET/PATCH/DELETE /admin/banners/:id`,
  `POST /admin/banners/:id/duplicate`,
  `PATCH /admin/banners/:id/activate`, `PATCH /admin/banners/reorder`
- Homepage: `GET /homepage` (public);
  `GET /admin/homepage`, `PUT /admin/homepage`,
  `GET /admin/homepage/sections`, `POST /admin/homepage/sections`,
  `PATCH /admin/homepage/sections/:id`,
  `DELETE /admin/homepage/sections/:id`,
  `PATCH /admin/homepage/sections/reorder`

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