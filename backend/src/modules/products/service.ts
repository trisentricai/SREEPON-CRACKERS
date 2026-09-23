import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { ApiError } from '../../utils/http';
import { toApiError } from '../../utils/prisma-errors';
import { slugify } from '../../utils/slug';
import type {
  AdminProductQuery,
  CreateProductImageInput,
  CreateProductInput,
  ProductQuery,
  ReorderProductImagesInput,
  SearchProductsQuery,
  UpdateProductImageInput,
  UpdateProductInput,
} from './schema';

const catalogFields = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  description: true,
  basePrice: true,
  mrpPrice: true,
  sku: true,
  unit: true,
  piecesPerBox: true,
  weightPerBox: true,
  minimumAge: true,
  isActive: true,
  isFeatured: true,
  isApproved: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

const catalogRelations = {
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: { displayOrder: 'asc' },
    select: { id: true, url: true, altText: true, displayOrder: true },
  },
  inventory: { select: { quantity: true, lowStockThreshold: true } },
} satisfies Prisma.ProductSelect;

const catalogSelect = { ...catalogFields, ...catalogRelations } satisfies Prisma.ProductSelect;

type PrismaTx = Prisma.TransactionClient;

/** Ids of a category and all of its descendant categories (for filters). */
async function resolveCategoryScope(input: string | undefined): Promise<string[] | undefined> {
  if (!input) return undefined;
  const category = await prisma.category.findFirst({
    where: { OR: [{ slug: input }, { id: input }] },
    select: { id: true, parentId: true },
  });
  if (!category) throw ApiError.badRequest('Category not found');

  const ids: string[] = [category.id];
  const pending = [category.id];
  while (pending.length > 0) {
    const parentId = pending.pop();
    if (!parentId) continue;
    const children = await prisma.category.findMany({
      where: { parentId },
      select: { id: true },
    });
    for (const child of children) {
      ids.push(child.id);
      pending.push(child.id);
    }
  }
  return ids;
}

const VALID_SORTS = {
  newest: [{ createdAt: 'desc' as const }],
  price_asc: [{ basePrice: 'asc' as const }],
  price_desc: [{ basePrice: 'desc' as const }],
  featured: [{ isFeatured: 'desc' as const }, { createdAt: 'desc' as const }],
  name_asc: [{ name: 'asc' as const }],
};

export async function listPublished(query: ProductQuery) {
  const categoryIds = await resolveCategoryScope(query.category);

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    isApproved: true,
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(query.featured ? { isFeatured: true } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' as const } },
            { sku: { contains: query.q, mode: 'insensitive' as const } },
            {
              OR: [
                { description: { contains: query.q, mode: 'insensitive' as const } },
                { shortDescription: { contains: query.q, mode: 'insensitive' as const } },
              ],
            },
          ],
        }
      : {}),
    ...(query.minPrice || query.maxPrice
      ? {
          basePrice: {
            ...(query.minPrice ? { gte: query.minPrice } : {}),
            ...(query.maxPrice ? { lte: query.maxPrice } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: catalogSelect,
      orderBy: VALID_SORTS[query.sort ?? 'newest'],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return { items, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

export async function searchProducts(query: SearchProductsQuery) {
  return listPublished({
    page: query.page,
    limit: query.limit,
    q: query.q,
    category: query.category,
    sort: 'newest',
  });
}

export async function getPublishedBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: catalogSelect,
  });
  if (!product || !product.isActive || !product.isApproved) {
    throw ApiError.notFound('Product not found');
  }
  return product;
}

export async function getPublishedById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: catalogSelect,
  });
  if (!product || !product.isActive || !product.isApproved) {
    throw ApiError.notFound('Product not found');
  }
  return product;
}

export async function listForAdmin(query: AdminProductQuery) {
  const categoryIds = await resolveCategoryScope(query.category);

  const where: Prisma.ProductWhereInput = {
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.isApproved !== undefined ? { isApproved: query.isApproved } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' as const } },
            { sku: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: catalogSelect,
      orderBy: VALID_SORTS[query.sort ?? 'newest'],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return { items, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

async function assertCategoryExists(tx: PrismaTx, categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) return;
  const category = await tx.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) throw ApiError.badRequest('Category does not exist');
}

export async function createProduct(input: CreateProductInput) {
  const slugValue = input.slug ?? slugify(input.name);
  if (!slugValue) {
    throw ApiError.badRequest('Could not derive a slug from the name; provide one explicitly');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await assertCategoryExists(tx, input.categoryId ?? null);

      const product = await tx.product.create({
        data: {
          name: input.name,
          slug: slugValue,
          sku: input.sku,
          description: input.description ?? null,
          shortDescription: input.shortDescription ?? null,
          categoryId: input.categoryId ?? null,
          basePrice: input.basePrice,
          mrpPrice: input.mrpPrice ?? null,
          unit: input.unit,
          piecesPerBox: input.piecesPerBox ?? 1,
          weightPerBox: input.weightPerBox ?? null,
          isActive: input.isActive,
          isFeatured: input.isFeatured,
          minimumAge: input.minimumAge ?? null,
          isApproved: input.isApproved ?? false,
        },
        select: catalogSelect,
      });

      // Every product starts with a default (zero) stock row.
      await tx.inventoryItem.create({
        data: { productId: product.id, quantity: 0, lowStockThreshold: 5 },
      });

      if (input.images?.length) {
        await tx.productImage.createMany({
          data: input.images.map((img, index) => ({
            productId: product.id,
            url: img.url,
            cloudinaryPublicId: img.cloudinaryPublicId ?? '',
            altText: img.altText ?? null,
            displayOrder: index,
          })),
        });
      }

      return product;
    });
  } catch (err) {
    throw toApiError(err, { resource: 'Product' });
  }
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Product not found');

  try {
    return await prisma.$transaction(async (tx) => {
      await assertCategoryExists(tx, input.categoryId ?? null);
      return tx.product.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.sku !== undefined ? { sku: input.sku } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
          ...(input.mrpPrice !== undefined ? { mrpPrice: input.mrpPrice } : {}),
          ...(input.unit !== undefined ? { unit: input.unit } : {}),
          ...(input.piecesPerBox !== undefined ? { piecesPerBox: input.piecesPerBox } : {}),
          ...(input.weightPerBox !== undefined ? { weightPerBox: input.weightPerBox } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
          ...(input.minimumAge !== undefined ? { minimumAge: input.minimumAge } : {}),
          ...(input.isApproved !== undefined ? { isApproved: input.isApproved } : {}),
        },
        select: catalogSelect,
      });
    });
  } catch (err) {
    throw toApiError(err, { resource: 'Product' });
  }
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, images: { select: { id: true } }, categoryId: true },
  });
  if (!product) throw ApiError.notFound('Product not found');

  const hasOrders = await prisma.orderItem.count({ where: { productId: id } });
  if (hasOrders > 0) {
    throw ApiError.conflict('Cannot delete a product referenced by existing orders; deactivate it instead');
  }

  try {
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.inventoryItem.deleteMany({ where: { productId: id } }),
      prisma.cartItem.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
  } catch (err) {
    throw toApiError(err, { resource: 'Product' });
  }
}

export async function setProductVisibility(id: string, isActive: boolean) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Product not found');
  try {
    return await prisma.product.update({ where: { id }, data: { isActive }, select: catalogSelect });
  } catch (err) {
    throw toApiError(err, { resource: 'Product' });
  }
}

export async function addProductImage(productId: string, input: CreateProductImageInput) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw ApiError.notFound('Product not found');

  try {
    const nextOrder = await prisma.productImage.aggregate({
      where: { productId },
      _max: { displayOrder: true },
    });
    const displayOrder = (nextOrder._max.displayOrder ?? -1) + 1;

    return await prisma.productImage.create({
      data: {
        productId,
        url: input.url,
        cloudinaryPublicId: input.cloudinaryPublicId,
        altText: input.altText ?? null,
        displayOrder,
      },
      select: { id: true, url: true, altText: true, displayOrder: true },
    });
  } catch (err) {
    throw toApiError(err, { resource: 'Product image' });
  }
}

export async function updateProductImage(imageId: string, input: UpdateProductImageInput) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId }, select: { id: true } });
  if (!image) throw ApiError.notFound('Product image not found');

  try {
    const updated = await prisma.productImage.update({
      where: { id: imageId },
      data: {
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.cloudinaryPublicId !== undefined ? { cloudinaryPublicId: input.cloudinaryPublicId } : {}),
        ...(input.altText !== undefined ? { altText: input.altText } : {}),
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      },
      select: { id: true, url: true, altText: true, displayOrder: true },
    });
    return updated;
  } catch (err) {
    throw toApiError(err, { resource: 'Product image' });
  }
}

export async function deleteProductImage(imageId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId }, select: { id: true } });
  if (!image) throw ApiError.notFound('Product image not found');
  try {
    await prisma.productImage.delete({ where: { id: imageId } });
  } catch (err) {
    throw toApiError(err, { resource: 'Product image' });
  }
}

export async function reorderProductImages(productId: string, items: ReorderProductImagesInput) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw ApiError.notFound('Product not found');

  const ids = items.map((i) => i.id);
  const found = await prisma.productImage.count({ where: { id: { in: ids }, productId } });
  if (found !== ids.length) throw ApiError.badRequest('One or more images do not belong to this product');

  try {
    // Two-phase reorder avoids the (productId, displayOrder) unique collision.
    await prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({
        where: { productId },
        data: { displayOrder: { increment: 10000 } },
      });
      for (const item of items) {
        await tx.productImage.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        });
      }
    });
    return items;
  } catch (err) {
    throw toApiError(err, { resource: 'Product image' });
  }
}