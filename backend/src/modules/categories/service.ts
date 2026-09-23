import { prisma } from '../../infrastructure/prisma';
import { ApiError } from '../../utils/http';
import { toApiError } from '../../utils/prisma-errors';
import { slugify } from '../../utils/slug';
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  ReorderCategoriesInput,
  UpdateCategoryInput,
} from './schema';

export type CategoryTree = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bannerImageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  parentId: string | null;
  productCount?: number;
  children: CategoryTree[];
};

const baseSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  parentId: true,
  bannerImageUrl: true,
  isFeatured: true,
  isActive: true,
  displayOrder: true,
} as const;

export async function listCategories(query: ListCategoriesQuery) {
  const rows = await prisma.category.findMany({
    where: {
      ...(query.parentId ? { parentId: query.parentId } : {}),
      ...(query.includeInactive ? {} : { isActive: true }),
    },
    select: { ...baseSelect, _count: { select: { products: true } } },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });

  return rows.map(({ _count, ...rest }) => ({ ...rest, productCount: _count.products }));
}

/** Build a nested tree from the full (flat) category table. */
export async function getCategoryTree(includeInactive = false): Promise<CategoryTree[]> {
  const rows = await prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: { ...baseSelect, _count: { select: { products: true } } },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });

  const nodes = new Map<string, CategoryTree>();
  for (const row of rows) {
    const { _count, ...rest } = row;
    nodes.set(row.id, { ...rest, productCount: _count.products, children: [] });
  }

  const roots: CategoryTree[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Active category by slug with its active children (storefront detail). */
export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { ...baseSelect, _count: { select: { products: { where: { isActive: true, isApproved: true } } } } },
  });
  if (!category || !category.isActive) throw ApiError.notFound('Category not found');

  const children = await prisma.category.findMany({
    where: { parentId: category.id, isActive: true },
    select: { id: true, name: true, slug: true, bannerImageUrl: true, isFeatured: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });

  const { _count, ...rest } = category;
  return { ...rest, productCount: _count.products, children };
}

export async function createCategory(input: CreateCategoryInput) {
  const slugValue = input.slug ?? slugify(input.name);
  if (!slugValue) {
    throw ApiError.badRequest('Could not derive a slug from the name; provide one explicitly');
  }

  if (input.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: input.parentId },
      select: { id: true },
    });
    if (!parent) throw ApiError.badRequest('Parent category does not exist');
  }

  // Default displayOrder = next slot under the parent (or root level).
  let displayOrder = input.displayOrder;
  if (displayOrder === undefined) {
    const last = await prisma.category.findFirst({
      where: { parentId: input.parentId ?? null },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });
    displayOrder = (last?.displayOrder ?? -1) + 1;
  }

  try {
    return await prisma.category.create({
      data: {
        name: input.name,
        slug: slugValue,
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        bannerImageUrl: input.bannerImageUrl ?? null,
        isFeatured: input.isFeatured ?? false,
        isActive: input.isActive ?? true,
        displayOrder,
      },
      select: baseSelect,
    });
  } catch (err) {
    throw toApiError(err, { resource: 'Category' });
  }
}

async function assertNoParentCycle(currentId: string, newParentId: string): Promise<void> {
  if (currentId === newParentId) {
    throw ApiError.badRequest('A category cannot be its own parent');
  }
  let cursor: string | null = newParentId;
  const visited = new Set<string>([currentId]);
  while (cursor) {
    if (visited.has(cursor)) {
      throw ApiError.badRequest('This parent would create a circular category tree');
    }
    visited.add(cursor);
    const node: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = node?.parentId ?? null;
  }
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true, isActive: true } });
  if (!existing) throw ApiError.notFound('Category not found');

  if (input.parentId !== undefined && input.parentId !== null) {
    const parent = await prisma.category.findUnique({
      where: { id: input.parentId },
      select: { id: true },
    });
    if (!parent) throw ApiError.badRequest('Parent category does not exist');
    await assertNoParentCycle(id, input.parentId);
  }

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.bannerImageUrl !== undefined ? { bannerImageUrl: input.bannerImageUrl } : {}),
        ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      },
      select: baseSelect,
    });

    // Deactivating a category hides the whole branch.
    if (input.isActive === false && existing.isActive) {
      await prisma.category.updateMany({
        where: { parentId: id, isActive: true },
        data: { isActive: false },
      });
    }
    return updated;
  } catch (err) {
    throw toApiError(err, { resource: 'Category' });
  }
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { children: true, products: true } } },
  });
  if (!category) throw ApiError.notFound('Category not found');
  if (category._count.children > 0) {
    throw ApiError.conflict(
      `Cannot delete "${category.name}": move or delete its ${category._count.children} subcategory(ies) first`,
    );
  }
  if (category._count.products > 0) {
    throw ApiError.conflict(
      `Cannot delete "${category.name}": it still has ${category._count.products} product(s)`,
    );
  }

  try {
    await prisma.category.delete({ where: { id } });
  } catch (err) {
    throw toApiError(err, { resource: 'Category' });
  }
}

export async function reorderCategories(items: ReorderCategoriesInput) {
  // Validate every id up-front so a partial reorder never commits.
  const ids = items.map((i) => i.id);
  const found = await prisma.category.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw ApiError.badRequest('One or more categories do not exist');

  await prisma.$transaction(
    items.map((item) =>
      prisma.category.update({ where: { id: item.id }, data: { displayOrder: item.displayOrder } }),
    ),
  );
  return items;
}