<style>
  :root { --coral: #ff6b5a; --teal: #14b8a6; }
  h1, h2 { border-bottom: 2px solid #ff6b5a; padding-bottom: 6px; }
  h3 { color: #14b8a6; }
  code { color: #c2410c; }
</style>

# SriPon — Agent Rules for Figma ↔ Code Design Integration

> Companion for the OpenCode / Claude agent that turns Figma designs (via the Figma MCP)
> into code for the **SriPon** monorepo. Use this as the single reference for design
> tokens, components, styling, assets, icons, and layout conventions so that design
> work stays byte-identical across **web**, **admin**, **mobile**, and **backend** layers.
>
> Accent colors used throughout this document: **#ff6b5a (Coral)** · **#14b8a6 (Teal)**.
> They appear below as the shipped **coral (primary action) + teal (secondary)** system built
> on the warm **ember/gold/paper** baseline, and as the reference palette for Figma variables.

---

## 1. Quick Facts

| App | Dir | Stack | Build | Deploy |
|---|---|---|---|---|
| Customer storefront | `web/` | React 19 + Vite 8 + TS 5.9 + Tailwind v4 + Firebase Auth | `npm run build` (tsc + vite) | Netlify (auto from master) + Firebase Hosting |
| Admin dashboard | `admin/` | React 19 + Vite + TS + Tailwind v4 + Supabase Auth | `npm run build` | Netlify |
| Mobile app | `mobile/` | Flutter (Material 3, google_fonts) | `flutter test` / `flutter analyze` | App stores |
| Backend API | `backend/` | Node + Express + Prisma + Zod | `npm run build` | Render |
| API contract | `docs/api.md` | OpenAPI — source of truth for `web/src/api/types.ts` | — | — |

**Golden rule:** the design system lives in 3 places that must stay in sync:
`web/src/index.css` (CSS `@theme`), `mobile/lib/core/widgets/widgets.dart` (`SriPonColors`),
and Figma variables. The comments in both files say so explicitly — if you change a token,
change all three.

---

## 2. Design Tokens

### 2.1 Where they live

- **Web:** `web/src/index.css` — Tailwind v4 CSS-first `@theme` block (NO `tailwind.config.js`; Tailwind v4 is configured in CSS via `@import "tailwindcss"`).
- **Mobile:** `mobile/lib/core/widgets/widgets.dart` → `abstract final class SriPonColors` (byte-identical hex values), consumed via `mobile/lib/core/theme/sripon_theme.dart`.
- **Admin:** `admin/src/index.css` — mirrors the web coral/teal tokens; layout uses a `bg-slate-900` sidebar with `bg-coral-600` active nav. When unifying designs, keep coral/teal actives + ember headings exactly in sync with web.
- **No JS/TS token modules.** Tokens are CSS-first; components consume them as Tailwind utilities (`text-coral-600`, `bg-coral-100`).

### 2.2 The ember palette (`web/src/index.css`, `@theme`)

```css
@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;500;600;700&family=Rubik:wght@300;400;500;600;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Nunito Sans", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Rubik", "Nunito Sans", ui-sans-serif, sans-serif;
  --default-font-family: var(--font-sans);

  /* Ember — primary brand orange (saffron #e65c00, deep #c2410c). */
  --color-ember-50: #fff6ed;
  --color-ember-100: #ffe9d6;
  --color-ember-200: #ffd2ae;
  --color-ember-300: #ffb77e;
  --color-ember-400: #f7934a;
  --color-ember-500: #ef751f;
  --color-ember-600: #e65c00;
  --color-ember-700: #c2410c;
  --color-ember-800: #9a3b05;
  --color-ember-900: #7a2d03;
  --color-ember-950: #4c1c02;

  /* Gold — secondary festive accent. */
  --color-gold-100: #f9efd4;
  --color-gold-200: #f2dfa4;
  --color-gold-300: #e9cc72;
  --color-gold-400: #e0b94a;
  --color-gold-500: #d9a021;
  --color-gold-600: #b98315;
  --color-gold-700: #9e6a00;
  --color-gold-800: #7d5400;
  --color-gold-900: #5e3f00;

  /* Warm surfaces + ink. */
  --color-paper: #fff8f0;
  --color-paper-strong: #fffdf8;
  --color-ink: #241b16;
  --color-ink-muted: #6f5a4c;
  --color-line: #e8ddd0;

  /* Semantic aliases. */
  --color-background: #fff8f0;
  --color-foreground: #241b16;
}
```

### 2.3 Color roles (map any Figma fill to these)

| Role | Token | Value | Used for |
|---|---|---|---|
| Page background | `bg-paper` / `bg-background` | `#fff8f0` | body, section shells |
| Card / raised surface | `bg-paper-strong` | `#fffdf8` | product cards, banner cards |
| Primary brand / CTAs | `bg-coral-600` | `#e8513f` | buttons, active links, badges, signature */
| Hover / deeper CTA | `bg-coral-700` | `#c93a29` | button hover (white text, 4.5:1) |
| Secondary links/focus | `text-teal-600` | `#0d9488` | inline links, checklist/trust accents |
| Headings / strong text | `text-ember-800/900` | `#9a3b05` / `#7a2d03` | titles inside warm surfaces |
| Muted text | `text-ember-900/50..70` | alpha of `#7a2d03` | secondary labels, subtitles |
| Body/ink text | `text-ink` / `text-foreground` | `#241b16` | default text color |
| Hairlines / borders | `border-line` | `#e8ddd0` | card borders, dividers |
| Accent / discount | `bg-gold-500`, `text-ink` | `#d9a021` | “% off” badges, festive sparkle |
| Soft tint surfaces | `bg-ember-50`, `bg-coral-100`, `border-coral-200` | see palette | header band, empty states, chips, selected filters |
| Error / success | `red-*` / `green-*` (Tailwind stock) | — | form + API errors, success |

### 2.4 Color roles — moved into the coral/teal table (§2.3); no separate admin palette.

### 2.5 Coral + teal tokens (shipped) — primary/secondary actives

```css
/* Primary/secondary actives across web + admin + mobile (deep variants keep text AA). */
--color-coral-50:  #fff2f0;
--color-coral-100: #ffe3df;
--color-coral-200: #ffcfc8;
--color-coral-300: #ff9d8f;
--color-coral-400: #ff8169;
--color-coral-500: #ff6b5a;   /* hero gradients, Sparkles, price highlights */
--color-coral-600: #e8513f;   /* PRIMARY CTA fill + white text (4.5:1) */
--color-coral-700: #c93a29;   /* PRIMARY CTA hover */
--color-teal-100:  #ccfbf1;
--color-teal-400:  #2dd4bf;
--color-teal-500:  #14b8a6;   /* trust/success accents, focus rings */
--color-teal-600:  #0d9488;   /* SECONDARY links/emphasis (AA on paper) */
--color-teal-700:  #0f766e;
```

Contrast guardrails: `#ff6b5a` on white ≈ 3.16:1 (headline/large only, never body text);
`#14b8a6` on white ≈ 2.9:1 (large/icon only). Use deep variants `coral-600`/`coral-700` for
white-text buttons and `teal-600` for text to keep WCAG AA. Gold `#d9a021` stays the festive
discount accent; headings/strong text stay `ember-800/900` on warm surfaces.

### 2.6 Candy tokens (sticker-book palette) — playful secondaries

```css
/* Sticker style pairs pastel fills with ink text + 2px ink borders. */
--color-sunny-100: #fff3d1;  --color-sunny-400: #ffd23e;  --color-sunny-500: #ffc531;  --color-sunny-600: #e8a800;
--color-bubble-100: #ddf0ff; --color-bubble-400: #6fbeff; --color-bubble-500: #4aa8ff; --color-bubble-600: #2b7fd4;
--color-grape-100: #eae2ff;  --color-grape-400: #b48cf7;  --color-grape-500: #9b6bf3;  --color-grape-600: #7c4fd0;
--color-mint-100: #d9f5e7;   --color-mint-400: #5ed598;   --color-mint-500: #2fbf71;   --color-mint-600: #1f9a59;
--color-candy-100: #ffe3ee;  --color-candy-400: #ff8fb8;  --color-candy-500: #ff7bac;  --color-candy-600: #e85a92;

/* Sticker-book elevation — hard offset shadows, zero blur. */
--shadow-sticker-sm: 2px 2px 0 0 var(--color-ink);
--shadow-sticker: 4px 4px 0 0 var(--color-ink);
--shadow-sticker-lg: 6px 6px 0 0 var(--color-ink);

/* Shape + motion. */
--radius-bubble: 1.5rem;
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```
Byte-mirrored in `mobile/lib/core/widgets/widgets.dart` (`SriPonColors.sunny/bubble/grape/mint/candy` +
`…100` pastels). Text on candy fills is always `ink` (never white on pastels).

### 2.6 Typography tokens

| Token | Font | Usage |
|---|---|---|
| `font-sans` (`--font-sans`) | **Nunito Sans** (300–700) | body, labels, inputs, buttons |
| `font-display` (`--font-display`) | **Baloo 2** (500–800, extrabold headings) | `font-display` headings, prices, nav brand, sticker chips |

Headline recipe: `font-display text-xl font-bold … sm:text-2xl` (section) …
`text-4xl font-extrabold sm:text-6xl` (hero). Solid-color text only — no gradient text in the codebase.
Flutter mirrors fonts via `GoogleFonts.nunitoSans` / `GoogleFonts.rubik`
(`mobile/lib/core/theme/sripon_theme.dart`).

### 2.7 Spacing, radius, shape

- **Layout grid:** 4px base; page gutter `px-4`, container `max-w-7xl`, vertical rhythm `py-8…py-24`.
- **Radius:** cards/inputs `rounded-xl` (12px); pills/chips/CTAs `rounded-full`; sticker surfaces `rounded-bubble` (24px).
- **Elevation:** sticker-book default — 2px `border-ink` + tiered hard shadows `shadow-sticker-sm` / `shadow-sticker` / `shadow-sticker-lg`. Hover cards: `hover:-translate-y-1 hover:shadow-sticker-lg`; press: `active:translate-x/y + active:shadow-none` (squish). Legacy soft shadows (`shadow-card/lifted/pop/cta`) retained for older surfaces.
- **Focus:** global `:focus-visible { outline: 2px solid var(--color-coral-600) }` in `@layer base`.

---

## 3. Component Library

### 3.1 Web — `web/src/components/storefront-ui.tsx` (reuse, do not reimplement)

```tsx
export function Badge({ children, tone = 'neutral' })           // neutral | green | red | amber | blue | orange | gold
export function Spinner({ label = 'Loading…' })                  // coral spinner + label
export function ErrorState({ error })                            // error card / phase-stub notice
export function EmptyState({ title, children })                  // dashed ember-50 card
export function SectionHeading({ title, subtitle, to, overline })// gold eyebrow (overline) + display font + teal "View all →" pill
export function ProductCard({ product })                         // fancy card: discount badge, wishlist heart, hover quick-add, inStock dot
export function ProductGrid({ children })                        // grid-cols-2 sm:grid-cols-3 lg:grid-cols-4
export function AuthGate({ isAuthenticated, isLoading, children, title })
```

**Motion & loading primitives** (no animation lib; all respect `prefers-reduced-motion`):
- `Reveal({ children, className, delay })` — IntersectionObserver fade-up wrapper; initial state skips animation when reduced-motion is set or IO is missing. Do NOT call `setState` synchronously in effects (`react-hooks/set-state-in-effect`).
- `Skeleton({ className })` — shimmer block (`.shimmer`); `ProductCardSkeleton` / `ProductGridSkeleton` for ready-made placeholder cards. Web uses skeletons instead of `Spinner` on home/products/detail/cart.
- `BrandMark({ name, to, light })` — inline gem: coral gradient tile + gold `PartyPopper`/`Sparkles` + wordmark (`font-display`). Header, footer, mobile AppBar.
- ProductCard quick actions: floating **wishlist heart** (top-right) + hover **quick-add** `+` (bottom-right) are *siblings* of the card `Link` (never nested interactive elements — React forbids it). Both call existing `/wishlist/items` and `/cart/items` mutations and redirect to `/profile` when signed out.
- Header: announcement ribbon `.marquee` (`.marquee-track`, 26s loop, killed under reduced motion); press states use `active:scale-95`. Mobile parity in `home_screen.dart` + `SriPonShimmer` (`widgets.dart`).

Patterns to copy from `ProductCard` (`storefront-ui.tsx:110`):
- Link card: `group flex flex-col overflow-hidden rounded-xl border border-line bg-paper-strong transition duration-300 hover:-translate-y-0.5 hover:shadow-lg`
- Image well: `relative aspect-square overflow-hidden bg-ember-50` + `img` with `loading="lazy"`, `object-cover`, `group-hover:scale-105`
- Discount badge: absolute `rounded-full bg-gold-500 px-2 py-0.5 text-xs font-bold text-ink`
- Price pair: `text-coral-600 font-bold` + strikethrough MRP `text-ember-900/40 line-through`
- Category/unit: `text-xs text-ember-900/50`, name `line-clamp-2 font-display text-sm font-semibold`

> NOTE: the active storefront skin is the sticker system below. Legacy `ProductCard` /
> `SectionHeading` / `BrandMark` / soft-shadow recipes in this doc are superseded but kept
> for reference — new work uses `sticker-ui.tsx` only.

### 3.1b Web — `web/src/components/sticker-ui.tsx` (the active design system)

```tsx
export function ChunkyButton({ to?, onClick?, type?, tone = 'sunny', disabled?, className?, children })
// tones: sunny | coral | white | grape | ink — pill, 2px ink border, hard shadow, squish press
export function StickerCard({ className?, children })   // white, ink border, hard shadow, bubble radius
export function StickerBrand({ name, to?, light? })     // sunny rocket tile + Baloo wordmark (header/footer)
export function Starburst({ label, sub?, className? })  // 12-point SVG badge for discounts/callouts
export function WaveDivider({ fill?, flip?, className? }) // wavy section divider (SVG)
export function Mascot({ className? })                   // Poppy the rocket, inline SVG (heroes/empty states)
export function FunChip({ icon, label, tone?, className? }) // pastel sticker chip (tones: sunny/bubble/grape/mint/candy/white)
export function FunHeading({ title, subtitle?, overline?, to?, actionLabel? }) // rotated sticker overline + Baloo title
export function StickerProductCard({ product })         // sticker card: image well, starburst, pastel unit pill, price + Add row, heart overlay
```
- `StickerProductCard` keeps the old card's behaviour (same `/wishlist/items` + `/cart/items`
  mutations, `/profile` redirect when signed out). Title/image link; price + Add live in normal
  flow (no nested interactives); wishlist heart is the single absolute overlay.
- Header (`app-shell.tsx`): sunny marquee ribbon, white bar with `border-b-2 border-ink`,
  pill nav (active = sunny chip), sticker icon buttons, coral badge with ink border,
  mobile scrollable chip nav, ink footer with wave transition + mini mascot.
- Mascot/brand are inline SVG + lucide (`Rocket`) — the no-binaries rule (§5.1) still holds.

### 3.2 Admin — `admin/src/components/admin-ui.tsx`

`Card`, `StatCard`, `Badge`, `Spinner`, `ErrorState`, `EmptyState`, `Button` (variants
`primary | secondary | ghost | danger`; default `bg-coral-600`), table + form primitives.
Admin styling uses slate/coral utilities.

### 3.3 Mobile — `mobile/lib/core/widgets/widgets.dart` + `storefront.dart` + `sticker.dart`

`SriPonColors` (tokens, incl. candy pastels), `SriPonSpinner`, `SriPonShimmer`, `SriPonEmptyState`;
Material 3 theme in `sripon_theme.dart` (Baloo 2 display via `GoogleFonts.baloo2`). Feature screens
live in `mobile/lib/features/<feature>/presentation/`. Sticker mirrors of the web system live in
`mobile/lib/core/widgets/sticker.dart`: `StickerCard`, `ChunkyButton`, `Starburst`
(`CustomPainter` 12-point star), `WaveDivider`, `Mascot` (widget-composed rocket), `FunChip`,
`FunHeading`, `stickerShadow()` — re-exported through `storefront.dart`.

Mobile IA: bottom tabs are **Home · Shop · Deals · Cart · Account** (`shell_screen.dart`);
Orders lives under Account + the `/orders` route. Named routes include `/cart` (CartScreen),
`/checkout`, `/wishlist`, `/orders`, `/products`, `/profile`. Deals screen
(`features/deals/presentation/deals_screen.dart`) fetches 60 products and filters
`discountPercent > 0` client-side, biggest saving first — same approach as web `/deals`.

### 3.4 Component governance for Figma integration

1. **First check `storefront-ui.tsx` / `admin-ui.tsx`** for an existing component before writing markup.
2. Feature-local components (e.g. `HeroFallback`, `BannerCard`, `HomeSection` in `home-page.tsx`) are page-scoped — promote to the shared file only when a second page needs them.
3. Status/loading/empty/error states come from the shared primitives (`Spinner`/`ErrorState`/`EmptyState`/`AuthGate`), not bespoke per-page divs.
4. No storybook exists — the Figma design file (and this doc) is the documentation.

---

## 4. Frameworks & Libraries

### Web (`web/package.json`)
- React 19 + `react-dom` 19, `react-router-dom` 7 (`createBrowserRouter` in `src/app/router.tsx`)
- Vite 8 (build+trancing), `@vitejs/plugin-react`, `@tailwindcss/vite`
- Tailwind CSS **v4** (CSS-first config — never add `tailwind.config.js`)
- TanStack Query 5 (`QueryClient` in `src/main.tsx`, default `retry: 1, staleTime: 30_000`)
- axios 1.x (single instance, see §6 API patterns), zod 3 (env + validation), `lucide-react` icons, `firebase` 12 (auth)

Path alias: `@/` → `src/` (set in `vite.config.ts`):
```ts
resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }
```

### Admin (`admin/package.json`) — same React/Vite/Tailwind stack, plus `@supabase/supabase-js`.

### Mobile — Flutter (Material 3), `google_fonts`, `riverpod`, Dio-based `api_client.dart`.

### Backend — Express + Prisma + Zod; module pattern in §7.

---

## 5. Asset Management

### 5.1 Rule: no binary assets in the repos
- `web/public/` contains only `_redirects` (Netlify SPA). Mobile ships no image bundles.
- All imagery (product photos, category banners, homepage artwork) is served as **URLs from Cloudinary** (`docs/cloudinary.md`). Folders: `sripon/products/{id}`, `sripon/banners/{placement}/{id}`, `sripon/homepage/{sectionId}`.
- The DB stores Cloudinary `public_id` (or a full URL in the API response) — never local files.
- Backend media helpers: `backend/src/infrastructure/cloudinary.ts`, upload endpoints in `backend/src/modules/media/*`.

### 5.2 Rendering conventions
```tsx
{image ? (
  <img src={image} alt={product.name}
       className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
       loading="lazy" />
) : (
  <div className="flex h-full items-center justify-center" aria-hidden>
    <PartyPopper className="h-12 w-12 text-ember-600/40" />
  </div>
)}
```
- Always `loading="lazy"` below the fold, real `alt` text, `object-cover`, fixed aspect wells (`aspect-square`, `h-40 w-full`, banner `min-h-[320px]`).
- Missing-image fallback = muted icon on `bg-ember-50`, never a broken-image glyph.
- Full-bleed banners overlay a text legibility gradient: `bg-gradient-to-r from-black/70 to-transparent`.

---

## 6. Icon System

- **Web/admin:** `lucide-react`, imported by name — `import { PartyPopper, Sparkles } from 'lucide-react'` (see `home-page.tsx:2`). Icons are inline SVG, inherit `currentColor`, sized via `h-*/w-*`, tinted with text tokens (`text-ember-600/40`).
- **Usage restraint:** lucide is used only for decoration/ambient sparkle today. Only add icons where the design calls for them; keep the same file-level import style.
- **Spinners** are custom inline SVG or Tailwind ring animation (`animate-spin rounded-full border-2 border-t-orange-600` in admin `Spinner`) — not lucide.
- **Mobile:** Flutter Material `IconData` (party/category glyphs) passed into `SriPonEmptyState`.
- **No image-icon / SVG-file sprite system exists.** Do not introduce one — use lucide for new icons.

---

## 7. Styling Approach

### 7.1 Methodology: utility-first Tailwind (v4), inline class strings only
- Global styles are minimal: `@layer base` sets `body` bg/color + `:focus-visible`; a global `prefers-reduced-motion` block kills transitions/animations (`web/src/index.css:63`).
- No CSS Modules, no styled-components, no `@apply` recipes (keep them out — Tailwind v4 `@apply` in `@layer` is available but the codebase doesn't use it).
- Custom classes only via the `@theme` design tokens, never ad-hoc hex values in JSX.

### 7.2 Responsive design (mobile-first)
- Breakpoints `sm:` (640) / `lg:` (1024) only — the codebase does not use `md:` for grids (grids: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`).
- Nav hides below `md` (`hidden … md:flex`).
- Container: `mx-auto max-w-7xl px-4`; hero text scales `text-4xl sm:text-6xl`.
- Vertical rhythm via `py-*` on sections; sticky header `sticky top-0 z-40 … backdrop-blur`.

### 7.3 Common recipes (copy these, don’t reinvent)
```tsx
// Chunky CTA (sticker system — use for all new buttons)
// <ChunkyButton to="/products" tone="sunny">Shop the fun</ChunkyButton>
// <ChunkyButton tone="coral" onClick={...}>Add to cart</ChunkyButton>
// Sticker card shell
// <StickerCard className="p-5">…</StickerCard>
// Section heading
// <FunHeading title="Shop by fun" subtitle="…" overline="…" to="/products" />
// Form / input styling uses `rounded-2xl border-2 border-ink bg-white px-4 py-2.5 shadow-sticker-sm`
// Focus ring is handled globally (ember-600 outline)
// Quantity stepper (product-details): bordered pill, − / count / + with
//   `disabled:opacity-40`, hover:bg-sunny-100, active:scale-95, Minus/Plus lucide icons
// Hero trust chips: FunChip row under the CTAs; mascot scene in a StickerCard
```

---

## 8. API Data Flow (affects how new UI reads data)

- **Envelope:** every response is `{ success, message, data, code?, errors? }` (`ApiEnvelope<T>` in `web/src/api/types.ts:24`).
- **Fetching:** pages use `useQuery` with `api.get<ApiEnvelope<T>>(path)` → return `data.data` (see `home-page.tsx:10`). Query keys are plain strings (`['homepage']`, `['cart']`).
- **Client:** `web/src/api/client.ts` exports the single `api` axios instance; token + unwind boilerplate lives in `web/src/api/http.ts` (`ApiError`, `Bearer` interceptor, first-login bridge-and-retry on “profile not found”).
- **Coercion:** `asArray<T>` (`normalize.ts`) tolerates bare-array vs `{ items }` payloads for list endpoints.
- **DOM types:** add new response shapes to `web/src/api/types.ts` only after the backend has them (mirror `docs/api.md`). Money = 2dp strings (`formatMoney` in `lib/format.ts`, en-IN INR), units via `formatUnit`.
- **Env:** anything read from `import.meta.env` must go through `config/env-schema.ts` → `config/env.ts` (zod-validated; `env.VITE_API_BASE_URL` default is the Render backend).

---

## 9. Project Structure

```
web/src/
  app/router.tsx            # createBrowserRouter + providers (MDScope → Auth)
  api/{types,normalize,http,client}.ts
  components/storefront-ui.tsx
  components/sticker-ui.tsx # ACTIVE design system (ChunkyButton, StickerCard, Starburst, Mascot, …)
  config/{env,env-schema}.ts
  context/md-scope.tsx
  features/auth/context/auth-context.tsx
  layout/app-shell.tsx
  lib/{format,utils}.ts
  pages/*.tsx               # one file per route (home, products, deals, cart, checkout, profile, …)
  services/firebase/*.ts
admin/src/                  # same shape as web: app/, api/, components/, features/, layout/, pages/, config/, lib/
mobile/lib/
  core/{models,widgets,theme,network,utils,providers}/
  features/<feature>/{presentation,data,application}/   # clean-ish architecture (`deals/` = deals screen)
backend/src/
  modules/<name>/{index,controller,service,schema}.ts   # module pattern
  infrastructure/{prisma,supabase,firebase,redis,cloudinary}.ts
  middleware/, routes/v1.ts, config/, utils/, types/
docs/                       # api.md, architecture.md, deployment.md, cloudinary.md, firebase.md …
```

**Feature-organization rule:** customer auth lives under `web/src/features/auth/`; everything
else is flat `pages/` + shared `components/`. Admin routes are gated by `RequireAdminAuth`
(`admin/src/layout/admin-layout.tsx`).

---

## 10. Figma-MCP Integration Playbook

When the user pastes a Figma URL or asks for design work, follow this order:

1. **Load design context first:** call `get_design_context` with the `nodeId` + `fileKey`
   parsed from the URL (convert `node-ids=12-34` → `12:34`; branch URLs use the branch key as `fileKey`).
2. **Search the design system:** `search_design_system` for components/variables that already
   exist (Button, Badge, Card, ProductCard, ember/gold tokens) before generating anything new.
3. **Translate to tokens, never hard-code colors:**
   - Any fill/auto color in Figma → nearest `ember-*` / `gold-*` / `paper` / `ink` token (table in §2.3).
   - Coral `#ff6b5a` / teal `#14b8a6` from new designs → the *shipped tokens* §2.5: `coral-600`
     (`#e8513f`) for primary CTA fills, `coral-700` hover, `teal-600` (`#0d9488`) for secondary
     links — deep variants for text/buttons. If a Figma variable already carries these names, map 1:1.
   - Fonts → Nunito Sans (body) / Rubik (display). Fix Figma “SemiBold/ExtraBold” spellings to
     Tailwind `font-semibold/font-extrabold`.
   - Radius 12px → `rounded-xl`, pills → `rounded-full`, spacing multiples of 4.
4. **Reuse components first:** if the mockup depicts a product grid, cart line, order card,
   or auth form, rebuild using `storefront-ui.tsx` / `admin-ui.tsx` primitives — adapt the
   reference, don’t redecode it.
5. **Adapt for the stack, then verify pixels:** keep the responsive recipe (§7.2), lazy/cropped
   images (§5), and `api` data flow (§8). Optionally run `generate_figma_design`/screenshot to
   compare, then adjust utilities until the layout matches.
6. **Keep 3-way token sync:** any token introduced in code must be added to `web/src/index.css`,
   `mobile/lib/core/widgets/widgets.dart`, and (if published) the Figma library. Never diverge.

**Do / Don’t**
- Do use `coral-600` as the primary action/accent color and `teal-600` for secondary links,
  resting on the warm ember/paper baseline (headings `ember-800/900`, gold festive accents).
- Do keep white text off `#ff6b5a`/`#14b8a6` (contrast) — use deep variants `coral-600/700`.
- Do lazy-load images, preserve `alt`, honor `prefers-reduced-motion`.
- Don’t introduce Tailwind colors not defined in `@theme`.
- Don’t create new icon SVGs when lucide has the glyph.
- Don’t break envelope/`ApiEnvelope` unwrapping in new data reads.

---

## 11. Verification & Quality Gates

- Nothing ships without: `npm run typecheck` **and** `npm run lint` **and** `npm run build` in the touched app (`web/` or `admin/`); `flutter analyze && flutter test` for mobile.
- Prettier runs (`npm run format:check`) — keep formatting canonical.
- Contrast rule: default brand text = `ember-800`+ on warm backgrounds; body copy `ink`.
- New `img`s must set `alt` and `loading="lazy"`; focusable controls get a visible `:focus-visible` ring (global, free).
- Design work is adapted from Figma as a *reference*; final truth is the code + this doc.

*— SriPon Design Integration Rules (Coral `#ff6b5a` · Teal `#14b8a6`)*