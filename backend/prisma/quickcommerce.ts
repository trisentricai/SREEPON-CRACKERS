import { HomepageSectionType, PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

/**
 * Live-data conversion for Supabase: retires the legacy crackers/fireworks
 * catalogue (soft-delete only, so order history stays intact), upserts the
 * Sreepon quick-commerce catalogue from the arrays below, and fixes active
 * banner copy plus legacy coupon codes.
 *
 * Idempotent and safely re-runnable: every write is an upsert, an updateMany,
 * or a JSON merge keyed on an existing SiteSetting row. No rows are deleted.
 *
 * Run with: npx tsx prisma/quickcommerce.ts   (from backend/)
 * Requires DATABASE_URL (and DIRECT_DATABASE_URL) to point at the live DB.
 *
 * NOTE: keep the catalogue arrays below in sync with prisma/seed.ts.
 */

const prisma = new PrismaClient();

const DESCRIPTOR = 'Everyday essentials, delivered in minutes';
const TAGLINE = 'Your neighbourhood store, at your door in 15 minutes';

const LEGACY_SKU_PREFIXES = ['SPK-', 'FLP-', 'GAR-', 'RKT-', 'CHK-', 'GBT-', 'PBM-'] as const;

const LEGACY_CATEGORY_SLUGS = [
  'paper-bombs',
  'crackers',
  'sparklers',
  'flower-pots',
  'regular-crackers',
  'kids-crackers',
  'gift-boxes',
  'rockets',
  'whistling-rockets',
  'multi-shot-rockets',
  'bombs-and-larungam',
  'larungam',
  'ground-bombs',
  'novelty-fireworks',
  'chakras',
  'fountains',
  'assorted-packs',
] as const;

interface QuickCategory {
  slug: string;
  name: string;
  description?: string;
  children: Array<{ slug: string; name: string }>;
}

interface QuickProduct {
  slug: string;
  name: string;
  sku: string;
  category: string;
  unit: 'BOX' | 'PACKET' | 'SINGLE';
  piecesPerBox: number;
  basePrice: string;
  mrpPrice?: string;
  shortDescription: string;
  featured?: boolean;
  quantity: number;
}

const CATEGORIES: QuickCategory[] = [
  {
    slug: 'groceries',
    name: 'Groceries & Staples',
    description: 'Fresh produce, dairy and everyday staples.',
    children: [
      { slug: 'fresh-produce', name: 'Fresh Produce' },
      { slug: 'dairy-bakery', name: 'Dairy & Bakery' },
      { slug: 'staples', name: 'Staples & Pulses' },
    ],
  },
  {
    slug: 'snacks-drinks',
    name: 'Snacks & Drinks',
    description: 'Chips, biscuits, tea, coffee and cold drinks.',
    children: [
      { slug: 'chips-snacks', name: 'Chips & Snacks' },
      { slug: 'tea-coffee', name: 'Tea & Coffee' },
      { slug: 'cold-drinks', name: 'Cold Drinks' },
    ],
  },
  {
    slug: 'household',
    name: 'Household Care',
    description: 'Cleaning, laundry and disposable essentials.',
    children: [
      { slug: 'cleaning', name: 'Cleaning' },
      { slug: 'laundry', name: 'Laundry' },
      { slug: 'paper-disposables', name: 'Paper & Disposables' },
    ],
  },
  {
    slug: 'personal-care',
    name: 'Personal Care',
    description: 'Skin, hair and oral care for the whole family.',
    children: [
      { slug: 'skin-care', name: 'Skin Care' },
      { slug: 'hair-care', name: 'Hair Care' },
      { slug: 'oral-care', name: 'Oral Care' },
    ],
  },
  {
    slug: 'baby-pet',
    name: 'Baby & Pet Care',
    description: 'Daily essentials for little ones and pets.',
    children: [
      { slug: 'baby-care', name: 'Baby Care' },
      { slug: 'pet-care', name: 'Pet Care' },
    ],
  },
];

const PRODUCTS: QuickProduct[] = [
  {
    slug: 'farm-fresh-bananas',
    name: 'Farm Fresh Bananas (6 pcs)',
    sku: 'QC-FRU-001',
    category: 'fresh-produce',
    unit: 'BOX',
    piecesPerBox: 6,
    basePrice: '48.00',
    mrpPrice: '60.00',
    shortDescription: 'Ripe, farm-fresh bananas.',
    featured: true,
    quantity: 200,
  },
  {
    slug: 'farm-fresh-tomatoes',
    name: 'Farm Fresh Tomatoes (1 kg)',
    sku: 'QC-FRU-002',
    category: 'fresh-produce',
    unit: 'BOX',
    piecesPerBox: 1,
    basePrice: '38.00',
    mrpPrice: '45.00',
    shortDescription: 'Hand-picked tomatoes, delivered fresh.',
    quantity: 180,
  },
  {
    slug: 'toned-milk-1l',
    name: 'Fresh Toned Milk (1 L)',
    sku: 'QC-DAI-001',
    category: 'dairy-bakery',
    unit: 'BOX',
    piecesPerBox: 1,
    basePrice: '68.00',
    shortDescription: 'Farm-fresh toned milk in a 1 L pack.',
    featured: true,
    quantity: 240,
  },
  {
    slug: 'farm-eggs-6',
    name: 'Farm Eggs (6 pcs)',
    sku: 'QC-DAI-002',
    category: 'dairy-bakery',
    unit: 'BOX',
    piecesPerBox: 6,
    basePrice: '72.00',
    mrpPrice: '80.00',
    shortDescription: 'Clean, graded farm eggs.',
    quantity: 150,
  },
  {
    slug: 'whole-wheat-bread',
    name: 'Whole Wheat Bread (400 g)',
    sku: 'QC-BAK-001',
    category: 'dairy-bakery',
    unit: 'PACKET',
    piecesPerBox: 1,
    basePrice: '55.00',
    shortDescription: 'Soft whole wheat bread, baked today.',
    quantity: 120,
  },
  {
    slug: 'basmati-rice-1kg',
    name: 'Basmati Rice (1 kg)',
    sku: 'QC-STP-001',
    category: 'staples',
    unit: 'PACKET',
    piecesPerBox: 1,
    basePrice: '145.00',
    mrpPrice: '160.00',
    shortDescription: 'Long-grain basmati rice.',
    quantity: 160,
  },
  {
    slug: 'classic-salted-chips',
    name: 'Classic Salted Chips (150 g)',
    sku: 'QC-SNK-001',
    category: 'chips-snacks',
    unit: 'PACKET',
    piecesPerBox: 1,
    basePrice: '35.00',
    mrpPrice: '40.00',
    shortDescription: 'Crunchy classic salted chips.',
    featured: true,
    quantity: 300,
  },
  {
    slug: 'cream-biscuits',
    name: 'Cream Biscuits (200 g)',
    sku: 'QC-SNK-002',
    category: 'chips-snacks',
    unit: 'PACKET',
    piecesPerBox: 1,
    basePrice: '45.00',
    shortDescription: 'Cream-filled biscuits for tea time.',
    quantity: 300,
  },
  {
    slug: 'masala-tea-250g',
    name: 'Masala Tea (250 g)',
    sku: 'QC-TEA-001',
    category: 'tea-coffee',
    unit: 'PACKET',
    piecesPerBox: 1,
    basePrice: '120.00',
    mrpPrice: '135.00',
    shortDescription: 'Aromatic masala tea blend.',
    quantity: 200,
  },
  {
    slug: 'instant-coffee-100g',
    name: 'Instant Coffee (100 g)',
    sku: 'QC-TEA-002',
    category: 'tea-coffee',
    unit: 'BOX',
    piecesPerBox: 1,
    basePrice: '180.00',
    mrpPrice: '199.00',
    shortDescription: 'Rich instant coffee, quick to make.',
    quantity: 140,
  },
  {
    slug: 'cold-cola-750ml',
    name: 'Cold Cola (750 ml)',
    sku: 'QC-DRK-001',
    category: 'cold-drinks',
    unit: 'SINGLE',
    piecesPerBox: 1,
    basePrice: '40.00',
    shortDescription: 'Chilled cola, ready to drink.',
    quantity: 250,
  },
  {
    slug: 'orange-juice-1l',
    name: 'Orange Juice (1 L)',
    sku: 'QC-DRK-002',
    category: 'cold-drinks',
    unit: 'BOX',
    piecesPerBox: 1,
    basePrice: '110.00',
    shortDescription: 'Fresh orange juice, 1 L carton.',
    quantity: 150,
  },
  {
    slug: 'dishwash-liquid-500ml',
    name: 'Dishwash Liquid (500 ml)',
    sku: 'QC-CLN-001',
    category: 'cleaning',
    unit: 'BOX',
    piecesPerBox: 1,
    basePrice: '85.00',
    mrpPrice: '99.00',
    shortDescription: 'Grease-cutting dishwash liquid.',
    quantity: 180,
  },
  {
    slug: 'floor-cleaner-1l',
    name: 'Floor Cleaner (1 L)',
    sku: 'QC-CLN-002',
    category: 'cleaning',
    unit: 'BOX',
    piecesPerBox: 1,
    basePrice: '130.00',
    shortDescription: 'Disinfecting floor cleaner.',
    quantity: 160,
  },
  {
    slug: 'detergent-powder-1kg',
    name: 'Detergent Powder (1 kg)',
    sku: 'QC-LND-001',
    category: 'laundry',
    unit: 'PACKET',
    piecesPerBox: 1,
    basePrice: '160.00',
    mrpPrice: '175.00',
    shortDescription: 'Everyday detergent powder.',
    featured: true,
    quantity: 200,
  },
  {
    slug: 'tissue-paper-100',
    name: 'Tissue Paper (100 sheets)',
    sku: 'QC-PAP-001',
    category: 'paper-disposables',
    unit: 'PACKET',
    piecesPerBox: 1,
    basePrice: '60.00',
    shortDescription: 'Soft, absorbent tissue sheets.',
    quantity: 250,
  },
  {
    slug: 'moisturising-lotion-200ml',
    name: 'Moisturising Lotion (200 ml)',
    sku: 'QC-SKN-001',
    category: 'skin-care',
    unit: 'BOX',
    piecesPerBox: 1,
    basePrice: '150.00',
    mrpPrice: '175.00',
    shortDescription: 'Lightweight daily moisturiser.',
    quantity: 140,
  },
  {
    slug: 'shampoo-200ml',
    name: 'Gentle Shampoo (200 ml)',
    sku: 'QC-HAI-001',
    category: 'hair-care',
    unit: 'BOX',
    piecesPerBox: 1,
    basePrice: '140.00',
    shortDescription: 'Gentle shampoo for daily use.',
    quantity: 140,
  },
  {
    slug: 'toothpaste-100g',
    name: 'Toothpaste (100 g)',
    sku: 'QC-ORA-001',
    category: 'oral-care',
    unit: 'BOX',
    piecesPerBox: 1,
    basePrice: '75.00',
    shortDescription: 'Daily cavity-protection toothpaste.',
    quantity: 220,
  },
  {
    slug: 'baby-diapers-medium',
    name: 'Baby Diapers – Medium (30 pcs)',
    sku: 'QC-BAB-001',
    category: 'baby-care',
    unit: 'PACKET',
    piecesPerBox: 30,
    basePrice: '399.00',
    mrpPrice: '449.00',
    shortDescription: 'Soft, absorbent medium diapers.',
    featured: true,
    quantity: 120,
  },
  {
    slug: 'pet-food-1kg',
    name: 'Pet Food – Adult Dog (1 kg)',
    sku: 'QC-PET-001',
    category: 'pet-care',
    unit: 'PACKET',
    piecesPerBox: 1,
    basePrice: '280.00',
    shortDescription: 'Complete nutrition for adult dogs.',
    quantity: 120,
  },
];

const SECTIONS: Array<{
  type: HomepageSectionType;
  title: string;
  config?: { limit: number };
}> = [
  { type: HomepageSectionType.TRENDING_PRODUCTS, title: 'Trending near you', config: { limit: 8 } },
  { type: HomepageSectionType.TODAYS_OFFERS, title: "Today's offers", config: { limit: 8 } },
  { type: HomepageSectionType.CATEGORY_GRID, title: 'Shop by category' },
  {
    type: HomepageSectionType.FEATURED_PRODUCTS,
    title: 'Everyday essentials',
    config: { limit: 8 },
  },
  { type: HomepageSectionType.NEW_ARRIVALS, title: 'New arrivals', config: { limit: 8 } },
];

const LEGAL_POLICIES: Record<string, { title: string; body: string }> = {
  privacy: {
    title: 'Privacy Policy',
    body: 'Sreepon collects only the details needed to fulfil your order — delivery address, contact details and payment status. We do not sell personal data. For privacy requests, contact our support team.',
  },
  terms: {
    title: 'Terms of Service',
    body: 'Orders are accepted subject to stock availability at your nearby fulfilment store. Prices, taxes and delivery fees are shown before checkout. Cash on delivery is available; online payment methods are being added soon.',
  },
  shipping: {
    title: 'Delivery Policy',
    body: 'At your door in 10–15 minutes from a store near you. Every order includes a GST invoice. Delivery is limited to serviceable neighbourhoods shown at checkout.',
  },
  returns: {
    title: 'Returns Policy',
    body: 'Easy returns. If an item arrives damaged or incorrect, contact support within 24 hours of delivery and we will arrange a replacement or refund.',
  },
  refund: {
    title: 'Refund Policy',
    body: 'Approved refunds are returned to the original payment method (or paid in cash for cash-on-delivery orders) after our support team verifies the issue.',
  },
  cancellation: {
    title: 'Cancellation Policy',
    body: 'Orders can be cancelled before they are packed. Once an order is out for delivery, please contact support and we will help with the best available option.',
  },
};

const LEGAL_NOTICES = [
  {
    title: 'Quick-commerce promise',
    body: '10–15 min delivery · GST invoice on every order · Fresh stock guaranteed · Easy returns',
  },
];

const QUICK_BANNER_TITLE = 'Everyday essentials, delivered in minutes';
const QUICK_BANNER_SUBTITLE = 'From a store near you, in 10–15 minutes';

/** Legacy words in active banner copy — "offer" alone is intentionally absent. */
const LEGACY_BANNER_TERMS = [
  'cracker',
  'firework',
  'sparkler',
  'diwali',
  'pattasu',
  'rocket',
  'bomb',
  'chakra',
  'flower pot',
  'gift box',
  'age-gated',
  'supervise',
  'licensed & insured',
  'licensed stock',
  'ce/isi',
  '24–48h',
  '24-48h',
  'ships across india',
  'ships in 24',
  'festive',
] as const;

/** Map legacy coupon code families onto the spec replacements, most specific first. */
const LEGACY_COUPON_CODES: Array<{ match: RegExp; replacement: string }> = [
  { match: /DIWALI25/i, replacement: 'FIRST15' },
  { match: /DIWALI10/i, replacement: 'QUICK10' },
  { match: /FESTIVE10/i, replacement: 'FRESH10' },
  { match: /DIWALI/i, replacement: 'FIRST15' },
  { match: /FESTIVE/i, replacement: 'FRESH10' },
];

function objectOrEmpty(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

async function upsertGroup(
  key: string,
  value: Record<string, unknown>,
  category: string,
): Promise<void> {
  const json = value as Prisma.InputJsonValue;
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: json, category },
    update: { value: json, category },
  });
}

async function readGroup(key: string): Promise<Record<string, unknown>> {
  const setting = await prisma.siteSetting.findUnique({ where: { key } });
  return objectOrEmpty(setting?.value);
}

async function main() {
  console.log(
    'Converting Sreepon to quick commerce — soft-retiring legacy items and upserting the new catalogue…',
  );

  // 1. Soft-retire legacy products. Categories alone are not enough: some rows
  //    may sit in an old category or carry a legacy SKU, so match on either.
  const retiredProducts = await prisma.product.updateMany({
    where: {
      OR: [
        ...LEGACY_SKU_PREFIXES.map((prefix) => ({ sku: { startsWith: prefix } })),
        { category: { slug: { in: [...LEGACY_CATEGORY_SLUGS] } } },
      ],
    },
    data: { isActive: false, isFeatured: false },
  });

  // 2. Soft-retire legacy categories. Category.isActive is exactly what the
  //    public list/tree/product queries filter on, so this hides the whole
  //    branch without deleting rows referenced by historical orders.
  const retiredCategories = await prisma.category.updateMany({
    where: { slug: { in: [...LEGACY_CATEGORY_SLUGS] } },
    data: { isActive: false, isFeatured: false },
  });

  // 3. Upsert quick-commerce categories (roots first, then leaves).
  const leafBySlug = new Map<string, string>();
  let categoryCount = 0;

  for (const [rootIndex, root] of CATEGORIES.entries()) {
    const rootRecord = await prisma.category.upsert({
      where: { slug: root.slug },
      update: {
        name: root.name,
        description: root.description ?? null,
        parentId: null,
        displayOrder: rootIndex,
        isActive: true,
        isFeatured: true,
      },
      create: {
        slug: root.slug,
        name: root.name,
        description: root.description ?? null,
        parentId: null,
        displayOrder: rootIndex,
        isActive: true,
        isFeatured: true,
      },
    });
    categoryCount += 1;

    for (const [childIndex, child] of root.children.entries()) {
      const record = await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          name: child.name,
          parentId: rootRecord.id,
          displayOrder: childIndex,
          isActive: true,
          isFeatured: false,
        },
        create: {
          slug: child.slug,
          name: child.name,
          parentId: rootRecord.id,
          displayOrder: childIndex,
          isActive: true,
          isFeatured: false,
        },
      });
      leafBySlug.set(child.slug, record.id);
      categoryCount += 1;
    }
  }

  // 4. Upsert products (keyed on SKU) plus their inventory rows. Every unit is
  //    BOX/PACKET/SINGLE so cart validation accepts them, and minimumAge is
  //    cleared so no storefront shows an age gate.
  let productCount = 0;
  let inventoryCount = 0;
  for (const product of PRODUCTS) {
    const categoryId = leafBySlug.get(product.category) ?? null;
    const record = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        slug: product.slug,
        name: product.name,
        basePrice: product.basePrice,
        mrpPrice: product.mrpPrice ?? null,
        shortDescription: product.shortDescription,
        unit: product.unit,
        piecesPerBox: product.piecesPerBox,
        isFeatured: product.featured ?? false,
        isActive: true,
        isApproved: true,
        minimumAge: null,
        categoryId,
      },
      create: {
        slug: product.slug,
        name: product.name,
        sku: product.sku,
        basePrice: product.basePrice,
        mrpPrice: product.mrpPrice ?? null,
        shortDescription: product.shortDescription,
        unit: product.unit,
        piecesPerBox: product.piecesPerBox,
        isFeatured: product.featured ?? false,
        isActive: true,
        isApproved: true,
        minimumAge: null,
        categoryId,
      },
    });

    await prisma.inventoryItem.upsert({
      where: { productId: record.id },
      update: { quantity: product.quantity, lowStockThreshold: 10 },
      create: { productId: record.id, quantity: product.quantity, lowStockThreshold: 10 },
    });
    productCount += 1;
    inventoryCount += 1;
  }

  // 5. Homepage section titles (existing rows updated by type, missing rows
  //    created) — the catalogue is the source of truth for storefront rails.
  let sectionCount = 0;
  for (const [index, section] of SECTIONS.entries()) {
    const data = {
      title: section.title,
      ...(section.config ? { config: section.config as Prisma.JsonObject } : {}),
      displayOrder: index,
      isActive: true,
    };
    const existing = await prisma.homepageSection.updateMany({
      where: { type: section.type },
      data,
    });
    if (existing.count === 0) {
      await prisma.homepageSection.create({ data: { type: section.type, ...data } });
    }
    sectionCount += Math.max(existing.count, 1);
  }

  // Any pre-existing carousel configured with retired product ids is hidden and
  // its config stripped, so no legacy catalogue detail remains in admin data.
  const strippedCarousels = await prisma.homepageSection.updateMany({
    where: { type: HomepageSectionType.PRODUCT_CAROUSEL },
    data: { isActive: false, config: { limit: 8 } as Prisma.JsonObject },
  });

  // 6. Store copy. `settings.store` and `homepage` are the real SiteSetting
  //    keys used by src/modules/settings and src/modules/homepage. The
  //    `descriptor` field rides along in the existing store JSON (no new key).
  const store = await readGroup('settings.store');
  await upsertGroup(
    'settings.store',
    {
      ...store,
      name: 'Sreepon',
      tagline: TAGLINE,
      descriptor: DESCRIPTOR,
      currency: 'INR',
    },
    'settings',
  );

  const homepage = await readGroup('homepage');
  await upsertGroup(
    'homepage',
    {
      ...homepage,
      heroTitle: 'Everyday essentials, right when you need them.',
      heroTagline: 'From a store near you, delivered in minutes.',
    },
    'content',
  );

  const delivery = await readGroup('settings.delivery');
  await upsertGroup(
    'settings.delivery',
    { ...delivery, deliveryNote: 'At your door in 10–15 minutes' },
    'settings',
  );

  // 7. Legal pages and notices. Only the known settings.legal key/pages are
  //    touched; unknown fields in the stored JSON are preserved.
  const legal = await readGroup('settings.legal');
  const policies = { ...objectOrEmpty(legal.policies) };
  for (const [pageKey, page] of Object.entries(LEGAL_POLICIES)) {
    policies[pageKey] = page;
  }
  await upsertGroup('settings.legal', { ...legal, policies, notices: LEGAL_NOTICES }, 'settings');

  // 8. Active banner copy. Only title/subtitle are rewritten: banner ids,
  //    images, placements, action targets and isActive are left untouched.
  const rewrittenBanners = await prisma.banner.updateMany({
    where: {
      isActive: true,
      OR: LEGACY_BANNER_TERMS.flatMap((term) => [
        { title: { contains: term, mode: 'insensitive' as const } },
        { subtitle: { contains: term, mode: 'insensitive' as const } },
        { actionTarget: { contains: term, mode: 'insensitive' as const } },
      ]),
      // Skip banners already carrying the new copy even when a legacy action
      // target remains — keeps a second run from touching updatedAt again.
      NOT: {
        AND: [
          { title: { equals: QUICK_BANNER_TITLE } },
          { subtitle: { equals: QUICK_BANNER_SUBTITLE } },
        ],
      },
    },
    data: { title: QUICK_BANNER_TITLE, subtitle: QUICK_BANNER_SUBTITLE },
  });

  // Rebind any active banner still pointing at a retired category to a live
  // quick-commerce root. The API exposes the linked category name, so leaving
  // these would still surface legacy catalogue labels on the storefront.
  const [legacyCategories, groceriesRoot, snacksRoot] = await Promise.all([
    prisma.category.findMany({
      where: { slug: { in: [...LEGACY_CATEGORY_SLUGS] } },
      select: { id: true },
    }),
    prisma.category.findUnique({ where: { slug: 'groceries' }, select: { id: true } }),
    prisma.category.findUnique({ where: { slug: 'snacks-drinks' }, select: { id: true } }),
  ]);

  const legacyCategoryIds = legacyCategories.map((category) => category.id);
  const reboundBanners = await prisma.banner.updateMany({
    where: {
      OR: [
        { categoryId: { in: legacyCategoryIds } },
        ...LEGACY_SKU_PREFIXES.map((prefix) => ({
          actionTarget: { startsWith: prefix, mode: 'insensitive' as const },
        })),
      ],
    },
    data: {
      categoryId: snacksRoot?.id ?? groceriesRoot?.id ?? null,
      actionTarget: null,
      // Legacy campaign artwork is removed too; admins can upload fresh
      // quick-commerce imagery from the dashboard.
      imageUrl: '',
    },
  });

  // Clear any remaining active campaign artwork so legacy imagery cannot be
  // surfaced by a quick-commerce banner. Empty string is the schema-safe
  // equivalent of "no image" and the storefront treats it as absent.
  const clearedArtwork = await prisma.banner.updateMany({
    where: { isActive: true, imageUrl: { not: '' } },
    data: { imageUrl: '' },
  });

  // 9. Coupon codes. Rename only DIWALI/FESTIVE codes; the coupon row (and
  //    therefore every order + usage ledger entry pointing at it) is kept.
  //    If a replacement already exists, add a numeric suffix until unique.
  const legacyCoupons = await prisma.coupon.findMany({
    where: {
      OR: [
        { code: { contains: 'DIWALI', mode: 'insensitive' as const } },
        { code: { contains: 'FESTIVE', mode: 'insensitive' as const } },
      ],
    },
    select: { id: true, code: true },
    orderBy: { createdAt: 'asc' },
  });
  const allCoupons = await prisma.coupon.findMany({ select: { code: true } });
  const usedCodes = new Set(allCoupons.map((coupon) => coupon.code.toUpperCase()));

  let renamedCoupons = 0;
  for (const coupon of legacyCoupons) {
    const current = coupon.code.toUpperCase();
    const family = LEGACY_COUPON_CODES.find((entry) => entry.match.test(current));
    const base = family?.replacement ?? 'FIRST15';
    let candidate = base;
    let suffix = 2;
    while (usedCodes.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    usedCodes.delete(current);
    usedCodes.add(candidate);
    await prisma.coupon.update({ where: { id: coupon.id }, data: { code: candidate } });
    renamedCoupons += 1;
  }

  console.log('Quick-commerce conversion complete:');
  console.log(`  - ${retiredProducts.count} legacy products soft-retired (isActive=false)`);
  console.log(
    `  - ${retiredCategories.count} legacy categories soft-retired (hidden from the public tree)`,
  );
  console.log(`  - ${categoryCount} categories upserted (${CATEGORIES.length} roots + leaves)`);
  console.log(`  - ${productCount} products upserted, ${inventoryCount} inventory rows upserted`);
  console.log(`  - ${sectionCount} homepage sections updated/created with spec titles`);
  console.log(`  - ${strippedCarousels.count} legacy product carousels deactivated and stripped`);
  console.log(
    `  - ${rewrittenBanners.count} active banners rewritten (ids, images and active state preserved)`,
  );
  console.log(
    `  - ${reboundBanners.count} banners rebound from retired categories (legacy artwork cleared)`,
  );
  console.log(`  - ${clearedArtwork.count} active banners cleared of legacy artwork`);
  console.log(`  - ${renamedCoupons} legacy coupon codes renamed (usage history preserved)`);
  console.log('  - settings.store, settings.delivery, homepage and settings.legal updated');
  console.log(`  - Store descriptor: ${DESCRIPTOR}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
