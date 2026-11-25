import { HomepageSectionType, PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

/**
 * Quick-commerce seed: a small, safe-for-offline catalogue of categories and
 * products for the Sreepon storefronts. Idempotent — safe to run repeatedly
 * (upserts keyed on slug/sku, and homepage sections keyed on type).
 * Requires DATABASE_URL (Supabase) to be configured.
 */

const prisma = new PrismaClient();

interface SeedCategory {
  slug: string;
  name: string;
  description?: string;
  children: Array<{ slug: string; name: string }>;
}

interface SeedProduct {
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

const CATEGORIES: SeedCategory[] = [
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

const PRODUCTS: SeedProduct[] = [
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

async function main() {
  console.log('Seeding Sreepon quick-commerce catalogue…');

  const leafBySlug = new Map<string, string>();
  let categoryCount = 0;

  for (const [rootIndex, root] of CATEGORIES.entries()) {
    const rootRecord = await prisma.category.upsert({
      where: { slug: root.slug },
      update: {
        name: root.name,
        description: root.description ?? null,
        isActive: true,
        isFeatured: true,
      },
      create: {
        slug: root.slug,
        name: root.name,
        description: root.description ?? null,
        displayOrder: rootIndex,
        isActive: true,
        isFeatured: true,
      },
    });
    categoryCount += 1;

    for (const [childIndex, childConfig] of root.children.entries()) {
      const child = await prisma.category.upsert({
        where: { slug: childConfig.slug },
        update: {
          name: childConfig.name,
          parentId: rootRecord.id,
          isActive: true,
          isFeatured: false,
        },
        create: {
          slug: childConfig.slug,
          name: childConfig.name,
          parentId: rootRecord.id,
          displayOrder: childIndex,
          isActive: true,
          isFeatured: false,
        },
      });
      leafBySlug.set(childConfig.slug, child.id);
      categoryCount += 1;
    }
  }

  let productCount = 0;
  for (const product of PRODUCTS) {
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
        categoryId: leafBySlug.get(product.category) ?? null,
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
        categoryId: leafBySlug.get(product.category) ?? null,
      },
    });

    await prisma.inventoryItem.upsert({
      where: { productId: record.id },
      update: { quantity: product.quantity, lowStockThreshold: 10 },
      create: { productId: record.id, quantity: product.quantity, lowStockThreshold: 10 },
    });
    productCount += 1;
  }

  // Homepage sections are keyed on type so a repeat seed also fixes stale
  // titles from an older storefront configuration (idempotent).
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

  console.log(
    `Seed complete: ${categoryCount} categories, ${productCount} products, ${sectionCount} homepage sections.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
