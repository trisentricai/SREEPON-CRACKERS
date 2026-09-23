import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { BannerPlacement, HomepageSectionType } from '../../types/enums';
import { ApiError } from '../../utils/http';
import { toApiError } from '../../utils/prisma-errors';
import { listActiveBanners } from '../banners/service';
import type {
  CreateSectionInput,
  HomepageConfigInput,
  ListSectionsQuery,
  ReorderSectionsInput,
  UpdateSectionInput,
} from './schema';

const HOMEPAGE_SETTING_KEY = 'homepage';

const sectionSelect = {
  id: true,
  type: true,
  title: true,
  config: true,
  displayOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HomepageSectionSelect;

type SectionRow = Prisma.HomepageSectionGetPayload<{ select: typeof sectionSelect }>;

function buildSectionView(section: SectionRow) {
  return {
    id: section.id,
    type: section.type,
    title: section.title,
    config: section.config,
    displayOrder: section.displayOrder,
    isActive: section.isActive,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

const productViewSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  unit: true,
  basePrice: true,
  mrpPrice: true,
  shortDescription: true,
  minimumAge: true,
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { displayOrder: 'asc' as const }, take: 1, select: { url: true, altText: true } },
} satisfies Prisma.ProductSelect;

const categoryViewSelect = {
  id: true,
  name: true,
  slug: true,
  bannerImageUrl: true,
} satisfies Prisma.CategorySelect;

function buildProductView(product: Prisma.ProductGetPayload<{ select: typeof productViewSelect }>) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    unit: product.unit,
    basePrice: product.basePrice.toFixed(2),
    mrpPrice: product.mrpPrice ? product.mrpPrice.toFixed(2) : null,
    shortDescription: product.shortDescription,
    minimumAge: product.minimumAge,
    category: product.category,
    image: product.images[0] ? product.images[0].url : null,
    imageAlt: product.images[0]?.altText ?? null,
  };
}

function configValue(config: unknown, key: string): unknown {
  if (typeof config !== 'object' || config === null) return undefined;
  return (config as Record<string, unknown>)[key];
}

async function loadProductsByIds(ids: unknown): Promise<ReturnType<typeof buildProductView>[]> {
  const productIds = Array.isArray(ids) ? ids.filter((value): value is string => typeof value === 'string') : [];
  if (productIds.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true, isApproved: true },
    select: productViewSelect,
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  return productIds
    .map((id) => byId.get(id))
    .filter((product): product is NonNullable<typeof product> => product !== undefined)
    .map(buildProductView);
}

async function categoriesForSection(categoryIds: string[] = []) {
  const where: Prisma.CategoryWhereInput = { isActive: true, ...(categoryIds.length ? { id: { in: categoryIds } } : { parentId: null }) };
  const categories = await prisma.category.findMany({
    where,
    select: categoryViewSelect,
    orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
  });
  if (categoryIds.length === 0) return categories;
  const byId = new Map(categories.map((category) => [category.id, category]));
  return categoryIds
    .map((id) => byId.get(id))
    .filter((category): category is NonNullable<typeof category> => category !== undefined);
}

async function featuredProducts(limit: number) {
  const products = await prisma.product.findMany({
    where: { isFeatured: true, isActive: true, isApproved: true },
    select: productViewSelect,
    orderBy: [{ createdAt: 'desc' as const }],
    take: limit,
  });
  return products.map(buildProductView);
}

async function newArrivals(limit: number) {
  const products = await prisma.product.findMany({
    where: { isActive: true, isApproved: true },
    select: productViewSelect,
    orderBy: [{ createdAt: 'desc' as const }],
    take: limit,
  });
  return products.map(buildProductView);
}

async function bestSellers(limit: number) {
  const grouped = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { productId: { not: null }, order: { status: { not: 'CANCELLED' as const } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' as const } },
    take: limit,
  });
  const productIds = grouped
    .map((group) => group.productId)
    .filter((id): id is string => id !== null)
    .slice(0, limit);
  if (productIds.length === 0) return featuredProducts(limit);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true, isApproved: true },
    select: productViewSelect,
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  return productIds
    .map((id) => byId.get(id))
    .filter((product): product is NonNullable<typeof product> => product !== undefined)
    .map(buildProductView);
}

function bannersForPlacement(banners: Awaited<ReturnType<typeof listActiveBanners>>, placements: BannerPlacement[]) {
  return banners.filter((banner) => placements.includes(banner.placement));
}

const PLACEMENT_ORDER: BannerPlacement[] = [
  BannerPlacement.HOME_HERO,
  BannerPlacement.HOME_SECONDARY,
  BannerPlacement.HOME_MIDDLE,
  BannerPlacement.HOME_BOTTOM,
  BannerPlacement.CATEGORY_TOP,
  BannerPlacement.PRODUCT_PROMOTION,
  BannerPlacement.APP_HOME,
];

async function resolveSectionContent(
  section: SectionRow,
  banners: Awaited<ReturnType<typeof listActiveBanners>>,
): Promise<Partial<Record<'banners' | 'categories' | 'products', unknown>>> {
  const config = section.config as Record<string, unknown> | null | undefined;
  const limit = typeof configValue(config, 'limit') === 'number' ? (configValue(config, 'limit') as number) : 8;

  switch (section.type) {
    case HomepageSectionType.HERO:
      return { banners: bannersForPlacement(banners, [BannerPlacement.HOME_HERO]) };
    case HomepageSectionType.PROMOTION:
      return {
        banners: bannersForPlacement(banners, [
          BannerPlacement.HOME_MIDDLE,
          BannerPlacement.HOME_SECONDARY,
          BannerPlacement.HOME_BOTTOM,
        ]),
      };
    case HomepageSectionType.CATEGORY_GRID:
      return { categories: await categoriesForSection() };
    case HomepageSectionType.CUSTOM_COLLECTION:
      return { products: await loadProductsByIds(configValue(config, 'productIds')) };
    case HomepageSectionType.PRODUCT_CAROUSEL:
      return { products: await loadProductsByIds(configValue(config, 'productIds')) };
    case HomepageSectionType.FEATURED_PRODUCTS:
      return { products: await featuredProducts(limit) };
    case HomepageSectionType.BEST_SELLERS:
      return { products: await bestSellers(limit) };
    case HomepageSectionType.NEW_ARRIVALS:
      return { products: await newArrivals(limit) };
    default:
      return {};
  }
}

export async function getHomepage() {
  const [sections, banners, setting] = await Promise.all([
    prisma.homepageSection.findMany({ where: { isActive: true }, select: sectionSelect, orderBy: [{ displayOrder: 'asc' }] }),
    listActiveBanners(),
    prisma.siteSetting.findUnique({ where: { key: HOMEPAGE_SETTING_KEY } }),
  ]);

  const resolvedSections = await Promise.all(
    sections.map(async (section) => ({
      ...buildSectionView(section),
      content: await resolveSectionContent(section, banners),
    })),
  );

  const groupedBanners = PLACEMENT_ORDER.map((placement) => ({
    placement,
    items: banners.filter((banner) => banner.placement === placement),
  })).filter((group) => group.items.length > 0);

  const config = setting?.value && typeof setting.value === 'object' && !Array.isArray(setting.value) ? setting.value : {};

  return { config, sections: resolvedSections, banners: groupedBanners };
}

export async function getHomepageConfig() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: HOMEPAGE_SETTING_KEY } });
  return {
    config:
      setting?.value && typeof setting.value === 'object' && !Array.isArray(setting.value) ? setting.value : {},
  };
}

export async function updateHomepageConfig(input: HomepageConfigInput) {
  const value = { ...input } as Prisma.InputJsonValue;
  await prisma.siteSetting.upsert({
    where: { key: HOMEPAGE_SETTING_KEY },
    create: { key: HOMEPAGE_SETTING_KEY, value, category: 'content' },
    update: { value, category: 'content' },
  });
  return { config: input };
}

export async function listSections(query: ListSectionsQuery) {
  const sections = await prisma.homepageSection.findMany({
    where: { ...(query.isActive !== undefined ? { isActive: query.isActive } : {}) },
    select: sectionSelect,
    orderBy: [{ displayOrder: 'asc' }],
  });
  return sections.map(buildSectionView);
}

export async function createSection(input: CreateSectionInput) {
  try {
    const section = await prisma.homepageSection.create({
      data: {
        type: input.type,
        title: input.title ?? null,
        config: input.config ? (input.config as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        displayOrder: input.displayOrder,
        isActive: input.isActive,
      },
      select: sectionSelect,
    });
    return buildSectionView(section);
  } catch (err) {
    throw toApiError(err, { resource: 'Homepage section' });
  }
}

export async function updateSection(id: string, input: UpdateSectionInput) {
  const existing = await prisma.homepageSection.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Homepage section not found');

  try {
    const section = await prisma.homepageSection.update({
      where: { id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.config !== undefined ? { config: input.config as unknown as Prisma.InputJsonValue } : {}),
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: sectionSelect,
    });
    return buildSectionView(section);
  } catch (err) {
    throw toApiError(err, { resource: 'Homepage section' });
  }
}

export async function deleteSection(id: string) {
  const existing = await prisma.homepageSection.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Homepage section not found');

  try {
    await prisma.homepageSection.delete({ where: { id } });
  } catch (err) {
    throw toApiError(err, { resource: 'Homepage section' });
  }
}

export async function reorderSections(items: ReorderSectionsInput['items']) {
  const ids = items.map((item) => item.id);
  const existing = await prisma.homepageSection.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (existing.length !== ids.length) {
    throw ApiError.badRequest('One or more homepage sections do not exist');
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.homepageSection.update({ where: { id: item.id }, data: { displayOrder: item.displayOrder } }),
    ),
  );
  return listSections({});
}