# SriPon — 2-Day Launch Plan & Development Roadmap

> Written 29 Oct 2026 against the live production stack. Every claim below was
> verified against the deployed bundles and APIs, not assumed.

---

## 1. TL;DR

The site **is already live** at `https://sreepon.in` (Cloudflare Pages), admin at
`https://sreepon-admin.pages.dev`, mobile points at the same API. Deploy pipelines work.

It is **not yet sellable**. Three P0 blockers:

| # | Blocker | Impact |
|---|---------|--------|
| 1 | **No online payment.** Web offers "Cash on delivery" + a visible **"Test gateway"** option; mobile hard-codes `provider: 'mock'` on every order. | You cannot collect money. Customers see a test option on a live store. |
| 2 | **Order totals ignore the settings.** `tax` and `deliveryFee` are hardcoded `new Prisma.Decimal(0)` when an order is created. GST rate, delivery fee and "free shipping above" in admin are decorative. | Wrong prices, no GST invoice, shipping cost absorbed. |
| 3 | **Nothing legal/trust on the site.** 6 policy pages exist in the API but all bodies are empty and no storefront page renders them. Footer "legal" links all point to `/profile`. | Razorpay merchant review will reject it; customers won't prepay. |

Everything else in section 3 is fast (≤1h each). The 2-day plan in section 4 fits
in ~14 working hours of code plus a content block.

---

## 2. What is actually live (verified)

| Surface | URL | Status |
|---|---|---|
| Storefront | `sreepon.in` (+`www`, +`sreepon-crackers.pages.dev`) | Live, builds from `master` |
| Admin | `sreepon-admin.pages.dev` | Live, `noindex`, includes the image uploader |
| API | `sreepon-api.trisentricai.workers.dev/api/v1` | Live, DB + Redis connected, same DB as admin |
| Legacy API | `sreepon-crackers.onrender.com/api/v1` | Still up, **running older code**, not used by any client |

- Web, admin and mobile all ship `VITE_API_BASE_URL = workers.dev`. Good — no split-brain.
- Cold-start problem is gone (Workers edge), but the Render instance is still the
  schema *default* — worth deleting so nobody falls back to it.
- Catalog: **7 products** (2 with photos), **16 categories** (10 with zero products, 0 with images).
- Orders: inventory rows exist and stock is enforced (`Insufficient stock` guard works).
- Auth, cart, wishlist, addresses, coupons, invoices, order tracking: implemented and mounted.

---

## 3. Full gap list

### P0 — must fix before taking real orders

| Gap | Where | Fix | Effort |
|---|---|---|---|
| Online payment missing | `web/src/pages/checkout-page.tsx` (only `cash` + `mock`) | Add Razorpay Checkout.js; backend order+webhook already exist | 3h |
| Mobile always posts `mock` | `mobile/lib/features/cart/presentation/checkout_screen.dart:317` | Switch to `cash` (COD) now; Razorpay SDK week 2 | 15m |
| Tax + delivery hardcoded to 0 | `backend/src/modules/orders/service.ts:349-351` | Read `getPublicSettings()`, apply `tax.rate` (and `taxInclusive`), `delivery.fee`, `freeShippingAbove` | 2h + tests |
| Policy pages empty and unrouted | API `/settings/legal` ready; no web route, no admin editor | 6 legal pages + footer links + simple admin tab | 3h |
| Store settings blank | Admin → Settings | Fill tagline, support email/phone, WhatsApp, GSTIN, delivery fee, free-ship threshold, socials | 30m (content) |

### P1 — visible quality, do in the same 2 days

| Gap | Where | Fix | Effort |
|---|---|---|---|
| Support/social settings never rendered on the storefront | `web/src/layout/app-shell.tsx` | Wire `settings.social` + `store.support*` into footer; add WhatsApp float CTA | 1h |
| Footer link placeholders ("Gift boxes" → `/products`, legal → `/profile`) | `app-shell.tsx:166-180` | Real targets: category slugs + policy routes | 20m |
| No SEO: single static title, no OG/Twitter, no `robots.txt`, no `sitemap.xml`, no JSON-LD | `web/index.html` | Per-route `document.title` + meta, OG image, robots, generated sitemap, `Product`/`Organization` JSON-LD | 2h |
| Stale `theme-color` `#e65c00` | `web/index.html:7` | `#b94f08` | 1m |
| Categories have no images | `admin/src/pages/categories-page.tsx` (field missing though API supports `bannerImageUrl`) | Add field + reuse `ImageUploadButton` | 1h |
| 10 empty categories + 5 products without photos | Admin content | Add products/photos, hide or merge empty categories | content |
| No transactional email/SMS provider at all (no keys, no code) | `backend/src/modules/notifications` | Week 1: Resend/GST invoice mail | 1 day |
| Render API still running stale code | infra | Delete the Render service | 5m |

### P2 — not blocking, improves conversion afterwards

- Catalogue is 7 SKUs — a live cracker store needs 40+ with photos to be credible.
- No reviews/ratings anywhere.
- No pincode serviceability check before checkout.
- No age-gate (18+) confirmation, only a displayed `minimumAge` field.
- Admin has no Homepage Sections editor (sections currently seeded, editable only via API).
- `maintenanceMode` setting is not honoured by the storefront.
- No announcement/notice ribbon from `legal.notices`.

---

## 4. The 2-day plan

Assumes one engineer + one content session. Code hours are conservative.

### Day 1 — make it transact (≈7h code)

| Time | Task | Files | Done when |
|---|---|---|---|
| 0:00–0:30 | Fix order math: apply tax rate + delivery fee + free-shipping threshold server-side | `backend/src/modules/orders/service.ts`, reuse `settings/service.getPublicSettings` | Order total = subtotal − discount + GST + shipping; unit test for all 3 branches |
| 0:30–1:00 | Add `GET /payments/:id` polling helper on web; hide `mock` provider in production builds | `checkout-page.tsx` | "Test gateway" invisible on the live build |
| 1:00–3:30 | Razorpay on web: load Checkout.js, open with `clientPayload.razorpay`, on success poll `GET /payments/:id` until `PAID`, show confirmation | `checkout-page.tsx`, `web/index.html` | Real ₹1 test payment on production with live keys |
| 3:30–3:45 | Mobile: `mock` → `cash`, copy the client payload instead of always posting a fake intent | `checkout_screen.dart` | New build places a COD order, status stays `PENDING` |
| 3:45–6:00 | Legal pages: `/policies/:key` route rendering `GET /settings/legal`, footer links, admin editor tab | `web/src/pages/policy-page.tsx` (new), `router.tsx`, `app-shell.tsx`, `admin/src/pages/settings-page.tsx` | All 6 policies reachable, editable in admin, non-empty |
| 6:00–7:00 | Storefront wiring of settings: footer support block, socials, WhatsApp float | `app-shell.tsx` | Phone/email/WhatsApp appear from admin values |

**Day 1 exit test:** place a real order on `sreepon.in`, pay ₹1 by UPI, see it `PAID` in admin, total includes GST + shipping.

### Day 2 — make it look and rank like a shop (≈6h code + content)

| Time | Task | Files | Done when |
|---|---|---|---|
| 0:00–1:00 | Category images: field + uploader in admin | `admin/src/pages/categories-page.tsx` | Each category tile shows its own photo |
| 1:00–3:00 | SEO: per-route titles/descriptions, OG/Twitter tags, `robots.txt`, `sitemap.xml`, `Product` + `Organization` JSON-LD, fix `theme-color` | `web/index.html`, `public/`, small `usePageMeta` hook | Rich preview on WhatsApp, sitemap lists all products |
| 3:00–4:00 | Content pass: settings values (GSTIN, shipping, support, socials), banner focal points, policy text | Admin | Settings screen fully filled |
| 4:00–5:30 | Catalogue pass: upload product photos, fix 16 categories (delete/merge empties, add missing products) | Admin | No category page is empty; every product has ≥1 photo |
| 5:30–6:00 | Final QA: mobile Safari + Android Chrome, 3 orders (COD, UPI, coupon), refund path, 404 route, Lighthouse run | — | Checklist below green |

### Launch checklist (definition of "live")

- [ ] Real payment succeeds and order flips to `PAID`
- [ ] Order total = subtotal − coupon + GST + shipping
- [ ] COD order reachable from admin, markable as paid/shipped
- [ ] All 6 policies live and linked from the footer
- [ ] Support email/phone/WhatsApp visible on every page
- [ ] Every product has a photo; no category with 0 products
- [ ] `robots.txt` + `sitemap.xml` resolve; OG preview renders
- [ ] Admin routes `noindex`; storefront indexable
- [ ] Mobile release build places a COD order (online pay = week 2)

---

## 5. Post-launch roadmap

### Week 1 — trust & notification
- Transactional email (Resend): order confirmation, payment receipt, shipping update. Backend has no mail provider at all today.
- GST invoice PDF (template + GSTIN already stored in settings).
- Admin Homepage Sections editor so marketing doesn't need API calls.
- Delete the Render service; keep only Workers.
- Uptime monitor on `/health` + error tracking (Sentry) on web/admin/backend.

### Week 2 — mobile parity
- Razorpay Flutter SDK in the app (replaces COD-only).
- Push notifications (device registration endpoint already exists, no sender).
- Deep links for `sreepon.in/products/slug/...`.
- Play Store + App Store submission (iOS CI workflow already present).

### Weeks 3–4 — conversion
- Reviews & ratings on product pages (needs a `reviews` module — not present yet).
- Pincode serviceability + delivery ETA before checkout.
- Abandoned-cart recovery (cart is server-side already).
- Coupon banner + "free shipping above ₹X" progress bar in the cart.
- Age gate (18+) confirmation for fireworks compliance.

### Weeks 5–8 — growth
- 40+ SKU catalogue with real photography, category imagery, Diwali/New Year campaign banners.
- Tamil/Hindi localisation (i18n), rupee formatting already correct.
- SEO content: gift-box and safety guides targeting Diwali keywords.
- Loyalty/referral, bulk-order enquiry form for families and corporates.
- Analytics funnel + A/B on hero and product card CTA.

---

## 6. Optimisation backlog (impact-ordered)

1. **Images** — serve Cloudinary `f_auto,q_auto,w_<n>,dpr_auto` per breakpoint. Current URLs are full-size masters; this is the single biggest LCP win on mobile data.
2. **Code splitting** — route-level `React.lazy` for checkout/orders/profile; the storefront ships one bundle today.
3. **Caching** — Cloudflare Cache Rules: `immutable` for `/assets/*`, `no-store` for `/api/v1/*` JSON (dynamic content is currently cacheable at the edge, which is why banner edits looked "stuck").
4. **Prefetch on intent** — prefetch product detail on card hover/tap, `/cart` after add-to-cart.
5. **Font loading** — self-host Rubik/Nunito Sans subsets, `font-display: swap`, preload the display weight only.
6. **Skeletons → real data** — homepage already has skeletons; extend to category grid so CLS stays ~0.
7. **Query tuning** — raise `staleTime` for settings/categories (rarely change), keep cart/orders at 0.
8. **Accessibility** — focus rings exist; add skip-link, verify 4.5:1 for `flame-500` text (2.9:1 on white — large text only, per `CLAUDE.md`).
9. **Monitoring** — Core Web Vitals RUM + `/health` synthetic check every 5 min.

---

## 7. Manual items only you can do

| Item | Why it blocks |
|---|---|
| Razorpay account + KYC → live `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` + webhook URL `…/api/v1/payments/webhooks/razorpay` | Without it, no online payment (code ships ready, keys pending) |
| GST registration + GSTIN string | Tax cannot be charged/invoiced correctly |
| Support phone / email / WhatsApp number | Needed on the site and for merchant review |
| Delivery fee + free-shipping threshold decision | Drives the order math fix |
| Product photography (or approve placeholders) | Visual credibility |
| Cloudflare Pages env vars (already set, verify `VITE_API_BASE_URL` after any change) | Wrong base URL = dead site |

---

## 8. Risk register

| Risk | Mitigation |
|---|---|
| Live keys not approved in time | Ship COD-only launch, keep "Test gateway" hidden, add UPI collect/manual confirmation as stopgap |
| Razorpay webhook not reachable | Test with a ₹1 live payment on day 1, not on launch day |
| Tax change alters existing order totals | Tax applies to new orders only; no backfill |
| Mobile release lag | Web is the launch surface; app follows in week 2 |
| Two APIs drift again | Delete Render; document Workers as the only API in `docs/deployment.md` |
