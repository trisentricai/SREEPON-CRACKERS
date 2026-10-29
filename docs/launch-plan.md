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
- - - 
 
 # #   9 .   I m p l e m e n t a t i o n   s t a t u s   ( u p d a t e d   2 9   O c t   2 0 2 6 ) 
 
 D a y   1   a n d   D a y   2   c o d e   s h i p p e d   ( ` m a s t e r `   �!  ` s r e e p o n . i n `   /   ` s r e e p o n - a d m i n . p a g e s . d e v `   v i a   C l o u d f l a r e   P a g e s ) . 
 
 # # #   L a n d e d 
 -   O r d e r   m a t h s   i n   ` b a c k e n d / s r c / m o d u l e s / o r d e r s / p r i c i n g . t s `   ( ` c o m p u t e O r d e r T o t a l s ` ) ,   w i r e d   i n t o 
     ` c r e a t e O r d e r `   v i a   ` g e t P u b l i c S e t t i n g s ( ) ` ;   t a x   e x c l u s i v e / i n c l u s i v e ,   d e l i v e r y   f e e , 
     f r e e - s h i p p i n g   t h r e s h o l d ,   c l a m p   a t   z e r o .   8   u n i t   t e s t s ,   D B - f r e e . 
 -   ` G E T   / o r d e r s / e s t i m a t e `   ( r e g i s t e r e d   b e f o r e   ` / o r d e r s / : i d ` )      d e b o u n c e d   l i v e 
     b r e a k d o w n   i n   c h e c k o u t . 
 -   ` G E T   / p a y m e n t s / p r o v i d e r s `   ( r e g i s t e r e d   b e f o r e   ` / p a y m e n t s / : i d ` )      o n l y   c o n f i g u r e d 
     g a t e w a y s ,   ` m o c k `   h i d d e n   i n   p r o d u c t i o n . 
 -   W e b   c h e c k o u t :   s e r v e r - d r i v e n   p r o v i d e r   l i s t ,   R a z o r p a y   C h e c k o u t . j s   o n   d e m a n d , 
     c o n f i r m a t i o n   b y   p o l l i n g   ` G E T   / p a y m e n t s / : i d ` ,   h o n e s t   c o n f i r m a t i o n   s c r e e n . 
 -   W e b   ` p o l i c y - p a g e . t s x `   ( ` / p o l i c i e s ` ,   ` / p o l i c i e s / : k e y ` )   +   f o o t e r   r e w r i t e   +   W h a t s A p p   f l o a t . 
 -   A d m i n   l e g a l   e d i t o r   i n   S e t t i n g s   +   ` T e x t A r e a ` ;   a d m i n   c a t e g o r y   i m a g e   u p l o a d e r . 
 -   M o b i l e   c h e c k o u t   p o s t s   ` p r o v i d e r :   ' c a s h ' ` . 
 -   S E O :   ` u s e P a g e M e t a `   /   ` u s e J s o n L d ` ,   b u i l d - t i m e   s i t e m a p   ( 2 2   U R L s ) ,   ` r o b o t s . t x t ` , 
     p e r - r o u t e   m e t a   +   J S O N - L D ,   ` S I T E . b a s e U r l   =   h t t p s : / / s r e e p o n . i n ` . 
 -   E m p t y   c a t e g o r i e s   h i d d e n   v i a   ` v i s i b l e C a t e g o r y T r e e `   i n   ` h o m e - p a g e . t s x `   a n d 
     ` p r o d u c t s - p a g e . t s x ` ;   ` C a t e g o r y G r i d `   r e n d e r s   ` b a n n e r I m a g e U r l `   w h e n   p r e s e n t . 
 -   E n v   d e f a u l t s   p o i n t   a t   t h e   W o r k e r s   A P I   ( n o t   t h e   l e g a c y   R e n d e r   e n d p o i n t ) . 
 
 # # #   S t i l l   o p e n   ( m e r c h a n t   /   o p s ) 
 -   R a z o r p a y   l i v e   k e y s   +   w e b h o o k   U R L   ( m a n u a l ,   b l o c k s   o n l i n e   p a y ) . 
 -   C o n t e n t :   G S T I N ,   s u p p o r t   c o n t a c t s ,   d e l i v e r y   f e e / t h r e s h o l d ,   p r o d u c t   p h o t o s , 
     c a t e g o r y   i m a g e s ,   s i x   p o l i c y   b o d i e s . 
 -   F i r e b a s e   a u t h o r i z e d   d o m a i n s   +   c o n s o l e   i t e m s . 
 -   D e l e t e   t h e   l e g a c y   R e n d e r   s e r v i c e ;   k e e p   W o r k e r s   a s   t h e   o n l y   A P I . 
 -   * * T e s t s   r u n   a g a i n s t   t h e   p r o d u c t i o n   S u p a b a s e   ` D A T A B A S E _ U R L ` . * *   ` n p m   t e s t `   m u t a t e s 
     l i v e   d a t a   ( c o n t e n t   t e s t   p r e v i o u s l y   b r o k e   o n   a   r e a l   ` H O M E _ H E R O `   b a n n e r ) .   P o i n t 
     V i t e s t   a t   a   s e p a r a t e   t h r o w a w a y   d a t a b a s e   b e f o r e   a n y   C I   g a t e   i s   a d d e d .   U n t i l   t h e n , 
     t r e a t   ` n p m   t e s t `   a s   a   r e a d - m o s t l y   s m o k e   c h e c k   a n d   r u n   ` o r d e r s - p r i c i n g . t e s t . t s ` 
     ( D B - f r e e )   i n   C I . 
 -   B u n d l e   s t i l l   o n e   1 . 1 9   M B   c h u n k   ( F i r e b a s e   p u l l e d   i n   b y   ` a u t h - c o n t e x t ` ) ;   r o u t e 
     l a z y - l o a d i n g   a l o n e   w o n ' t   s h r i n k   i t .   C o d e - s p l i t t i n g   b a c k l o g   r e m a i n s . 
 -   M o b i l e   c h a n g e s   o n l y   r e a c h   p h o n e s   v i a   a   n e w   s t o r e   r e l e a s e . 
 
 # # #   G a t e s   ( l a s t   r u n ) 
 -   w e b :   t y p e c h e c k   ',   l i n t   '  ( w a r n i n g s   o n l y ) ,   b u i l d   '  ( p o s t b u i l d   s i t e m a p :   2 2   U R L s ) 
 -   a d m i n :   t y p e c h e c k   ',   l i n t   ',   b u i l d   '
 -   b a c k e n d :   t y p e c h e c k   ',   1 7 5 / 1 7 5   t e s t s   ( o r d e r s - p r i c i n g   8 / 8 )  
 