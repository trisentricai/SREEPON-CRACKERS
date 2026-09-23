import { PrismaClient } from '@prisma/client';

/**
 * Phase 2 seed: a small, safe-for-offline catalog of categories and products.
 * Idempotent — safe to run repeatedly (upserts keyed on slug/sku).
 * Requires DATABASE_URL (Supabase) to be configured.
 */

const prisma = new PrismaClient();

interface SeedCategory {
  slug: string;
  name: string;
  description?: string;
  children: Array<{ slug: string; name: string }>;
}

const CATEGORIES: SeedCategory[] = [
  {
    slug: 'crackers',
    name: 'Crackers (Pattasu)',
    description: 'Classic Diwali crackers — sparklers, flower pots, garlands and more.',
    children: [
      { slug: 'sparklers', name: 'Sparklers' },
      { slug: 'flower-pots', name: 'Flower Pots' },
      { slug: 'regular-crackers', name: 'Regular Crackers' },
      { slug: 'kids-crackers', name: 'Kids Range' },
      { slug: 'gift-boxes', name: 'Gift Boxes' },
    ],
  },
  {
    slug: 'rockets',
    name: 'Rockets & Sky Shots',
    description: 'Whistling and multi-shot rockets for open skies.',
    children: [
      { slug: 'whistling-rockets', name: 'Whistling Rockets' },
      { slug: 'multi-shot-rockets', name: 'Multi-Shot Rockets' },
    ],
  },
  {
    slug: 'bombs-and-larungam',
    name: 'Bombs & Larungam',
    children: [
      { slug: 'larungam', name: 'Larungam' },
      { slug: 'ground-bombs', name: 'Ground Bombs' },
    ],
  },
  {
    slug: 'novelty-fireworks',
    name: 'Novelty Fireworks',
    description: 'Chakras, wheels, fountain cones and fun assortment packs.',
    children: [
      { slug: 'chakras', name: 'Chakras & Wheels' },
      { slug: 'fountains', name: 'Fountains & Cones' },
      { slug: 'assorted-packs', name: 'Assorted Packs' },
    ],
  },
];

const PRODUCTS: Array<{
  slug: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  piecesPerBox: number;
  basePrice: string;
  mrpPrice?: string;
  shortDescription: string;
  featured?: boolean;
  quantity: number;
}> = [
  {
    slug: 'electrical-sparklers-5-inch',
    name: 'Electrical Sparklers 5 inch (48 pcs)',
    sku: 'SPK-50048',
    category: 'sparklers',
    unit: 'BOX',
    piecesPerBox: 48,
    basePrice: '85.00',
    mrpPrice: '100.00',
    shortDescription: 'Bright, long-burning classic sparklers.',
    quantity: 200,
  },
  {
    slug: 'twinkle-star-sparklers',
    name: 'Twinkle Star Sparklers (25 pcs)',
    sku: 'SPK-TW25',
    category: 'sparklers',
    unit: 'BOX',
    piecesPerBox: 25,
    basePrice: '65.00',
    mrpPrice: '75.00',
    shortDescription: 'Multi-colour twinkle sparklers for kids.',
    quantity: 150,
  },
  {
    slug: 'olympic-flower-pot',
    name: 'Olympic Flower Pot (100 shots)',
    sku: 'FLP-OGM100',
    category: 'flower-pots',
    unit: 'SINGLE',
    piecesPerBox: 1,
    basePrice: '45.00',
    shortDescription: '100 multi-colour shots from a single cone.',
    quantity: 500,
  },
  {
    slug: 'garland-1000-wala',
    name: 'Garland 1000 Wala',
    sku: 'GAR-1000',
    category: 'regular-crackers',
    unit: 'BOX',
    piecesPerBox: 1,
    basePrice: '220.00',
    mrpPrice: '250.00',
    shortDescription: 'The classic 1000-shot garland.',
    featured: true,
    quantity: 300,
  },
  {
    slug: 'rocket-pencil-whistling-pack',
    name: 'Whistling Rocket Pencil (pack of 6)',
    sku: 'RKT-WP6',
    category: 'whistling-rockets',
    unit: 'PACKET',
    piecesPerBox: 6,
    basePrice: '110.00',
    mrpPrice: '130.00',
    shortDescription: 'High-flying whistling rockets, pack of 6.',
    quantity: 120,
  },
  {
    slug: 'chakra-lal-100',
    name: 'Lal Chakri (Colour Chakra, 100 shots)',
    sku: 'CHK-LAL100',
    category: 'chakras',
    unit: 'SINGLE',
    piecesPerBox: 1,
    basePrice: '38.00',
    shortDescription: 'Spinning colour wheel chakra.',
    quantity: 400,
  },
  {
    slug: 'diwali-gift-box-royal',
    name: 'Diwali Gift Box – Royal (25 pc)',
    sku: 'GBT-ROY25',
    category: 'gift-boxes',
    unit: 'BOX',
    piecesPerBox: 25,
    basePrice: '420.00',
    mrpPrice: '499.00',
    shortDescription: 'Curated mix of sparklers, chakras and sweet crackers.',
    featured: true,
    quantity: 80,
  },
];

async function main() {
  console.log('Seeding SriPon catalog…');

  const rootBySlug = new Map<string, { id: string }>();
  const leafBySlug = new Map<string, { id: string }>();
  let categoryCount = 0;

  for (const root of CATEGORIES) {
    const rootRecord = await prisma.category.upsert({
      where: { slug: root.slug },
      update: { name: root.name, description: root.description ?? null },
      create: {
        slug: root.slug,
        name: root.name,
        description: root.description ?? null,
        displayOrder: rootBySlug.size,
      },
    });
    rootBySlug.set(root.slug, { id: rootRecord.id });
    categoryCount += 1;

    for (const childConfig of root.children) {
      const parent = rootBySlug.get(root.slug);
      const child = await prisma.category.upsert({
        where: { slug: childConfig.slug },
        update: { name: childConfig.name, parentId: parent?.id },
        create: {
          slug: childConfig.slug,
          name: childConfig.name,
          parentId: parent?.id,
          displayOrder: leafBySlug.size,
        },
      });
      leafBySlug.set(childConfig.slug, { id: child.id });
      categoryCount += 1;
    }
  }

  let productCount = 0;
  for (const product of PRODUCTS) {
    const category = leafBySlug.get(product.category);
    const record = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        basePrice: product.basePrice,
        mrpPrice: product.mrpPrice ?? null,
        shortDescription: product.shortDescription,
        isFeatured: product.featured ?? false,
        categoryId: category?.id,
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
        categoryId: category?.id,
      },
    });

    await prisma.inventoryItem.upsert({
      where: { productId: record.id },
      update: { quantity: product.quantity },
      create: {
        productId: record.id,
        quantity: product.quantity,
        lowStockThreshold: 10,
      },
    });
    productCount += 1;
  }

  console.log(`Seed complete: ${categoryCount} categories, ${productCount} products.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });