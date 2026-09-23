import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import {
  AuditAction,
  AuditActorType,
  type BannerPlacement,
} from '../../types/enums';
import { ApiError } from '../../utils/http';
import { toApiError } from '../../utils/prisma-errors';
import type {
  ActivateBannerInput,
  AdminListBannersQuery,
  CreateBannerInput,
  ReorderBannersInput,
  UpdateBannerInput,
} from './schema';

const bannerSelect = {
  id: true,
  placement: true,
  title: true,
  subtitle: true,
  imageUrl: true,
  actionType: true,
  actionTarget: true,
  categoryId: true,
  category: { select: { id: true, name: true, slug: true } },
  displayOrder: true,
  startAt: true,
  endAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BannerSelect;

type BannerRow = Prisma.BannerGetPayload<{ select: typeof bannerSelect }>;

function buildBannerView(banner: BannerRow) {
  return {
    id: banner.id,
    placement: banner.placement,
    title: banner.title,
    subtitle: banner.subtitle,
    imageUrl: banner.imageUrl,
    actionType: banner.actionType,
    actionTarget: banner.actionTarget,
    category: banner.category ? { id: banner.category.id, name: banner.category.name, slug: banner.category.slug } : null,
    displayOrder: banner.displayOrder,
    startAt: banner.startAt,
    endAt: banner.endAt,
    isActive: banner.isActive,
    createdAt: banner.createdAt,
    updatedAt: banner.updatedAt,
  };
}

function parseDateFilters(input: { startAt?: Date; endAt?: Date }): { startAt?: Date; endAt?: Date } {
  return {
    ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
    ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
  };
}

function writeBannerAudit(
  params: {
    actorId: string | null;
    action: AuditAction;
    bannerId: string;
    summary: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  return prisma.auditLog.create({
    data: {
      actorType: AuditActorType.ADMIN,
      actorId: params.actorId ?? undefined,
      action: params.action,
      resource: `banner:${params.bannerId}`,
      requestId: params.requestId,
      summary: params.summary,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

async function assertCategoryExists(categoryId: string | undefined): Promise<void> {
  if (!categoryId) return;
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) throw ApiError.badRequest('Referenced category does not exist');
}

function activeWindowWhere(after: Date): Prisma.BannerWhereInput {
  return {
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: after } }] },
      { OR: [{ endAt: null }, { endAt: { gte: after } }] },
    ],
  };
}

export async function listActiveBanners() {
  const banners = await prisma.banner.findMany({
    where: { isActive: true, ...activeWindowWhere(new Date()) },
    select: bannerSelect,
    orderBy: [{ placement: 'asc' }, { displayOrder: 'asc' }],
  });
  return banners.map(buildBannerView);
}

export async function listBannersForPlacement(placement: BannerPlacement) {
  const banners = await prisma.banner.findMany({
    where: { placement, isActive: true, ...activeWindowWhere(new Date()) },
    select: bannerSelect,
    orderBy: [{ displayOrder: 'asc' }],
  });
  return banners.map(buildBannerView);
}

export async function listAllBanners(query: AdminListBannersQuery) {
  const where: Prisma.BannerWhereInput = {
    ...(query.placement ? { placement: query.placement } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.q
      ? { OR: [{ title: { contains: query.q, mode: 'insensitive' as const } }, { subtitle: { contains: query.q, mode: 'insensitive' as const } }] }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.banner.count({ where }),
    prisma.banner.findMany({
      where,
      select: bannerSelect,
      orderBy: [{ placement: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    items: items.map(buildBannerView),
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  };
}

export async function createBanner(input: CreateBannerInput, actorId: string | null, requestId?: string) {
  await assertCategoryExists(input.categoryId);
  try {
    const banner = await prisma.banner.create({
      data: {
        placement: input.placement,
        title: input.title,
        subtitle: input.subtitle ?? null,
        imageUrl: input.imageUrl,
        actionType: input.actionType,
        actionTarget: input.actionTarget ?? null,
        categoryId: input.categoryId ?? null,
        displayOrder: input.displayOrder,
        ...parseDateFilters(input),
        isActive: input.isActive,
      },
      select: bannerSelect,
    });
    await writeBannerAudit({
      actorId,
      action: AuditAction.BANNER_CREATED,
      bannerId: banner.id,
      summary: `Banner "${banner.title}" created (${banner.placement})`,
      requestId,
    });
    return buildBannerView(banner);
  } catch (err) {
    throw toApiError(err, { resource: 'Banner' });
  }
}

export async function getBanner(id: string) {
  const banner = await prisma.banner.findUnique({ where: { id }, select: bannerSelect });
  if (!banner) throw ApiError.notFound('Banner not found');
  return buildBannerView(banner);
}

export async function updateBanner(
  id: string,
  input: UpdateBannerInput,
  actorId: string | null,
  requestId?: string,
) {
  const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) throw ApiError.notFound('Banner not found');
  await assertCategoryExists(input.categoryId);

  try {
    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...(input.placement !== undefined ? { placement: input.placement } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.actionType !== undefined ? { actionType: input.actionType } : {}),
        ...(input.actionTarget !== undefined ? { actionTarget: input.actionTarget } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
        ...parseDateFilters(input),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: bannerSelect,
    });
    await writeBannerAudit({
      actorId,
      action: AuditAction.BANNER_UPDATED,
      bannerId: banner.id,
      summary: `Banner "${banner.title}" updated`,
      requestId,
      metadata: { fields: Object.keys(input) },
    });
    return buildBannerView(banner);
  } catch (err) {
    throw toApiError(err, { resource: 'Banner' });
  }
}

export async function deleteBanner(id: string, actorId: string | null, requestId?: string) {
  const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) throw ApiError.notFound('Banner not found');

  try {
    await prisma.banner.delete({ where: { id } });
    await writeBannerAudit({
      actorId,
      action: AuditAction.BANNER_UPDATED,
      bannerId: id,
      summary: `Banner "${existing.title}" deleted`,
      requestId,
    });
  } catch (err) {
    throw toApiError(err, { resource: 'Banner' });
  }
}

export async function duplicateBanner(id: string, actorId: string | null, requestId?: string) {
  const source = await prisma.banner.findUnique({ where: { id }, select: bannerSelect });
  if (!source) throw ApiError.notFound('Banner not found');

  const banner = await prisma.banner.create({
    data: {
      placement: source.placement,
      title: `${source.title} (copy)`,
      subtitle: source.subtitle,
      imageUrl: source.imageUrl,
      actionType: source.actionType,
      actionTarget: source.actionTarget,
      categoryId: source.categoryId,
      displayOrder: source.displayOrder + 1,
      startAt: source.startAt,
      endAt: source.endAt,
      isActive: false,
    },
    select: bannerSelect,
  });
  await writeBannerAudit({
    actorId,
    action: AuditAction.BANNER_CREATED,
    bannerId: banner.id,
    summary: `Banner "${source.title}" duplicated`,
    requestId,
  });
  return buildBannerView(banner);
}

export async function activateBanner(id: string, input: ActivateBannerInput, actorId: string | null) {
  const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) throw ApiError.notFound('Banner not found');

  const banner = await prisma.banner.update({
    where: { id },
    data: { isActive: input.isActive },
    select: bannerSelect,
  });
  await writeBannerAudit({
    actorId,
    action: AuditAction.BANNER_UPDATED,
    bannerId: banner.id,
    summary: `Banner "${banner.title}" ${input.isActive ? 'activated' : 'deactivated'}`,
  });
  return buildBannerView(banner);
}

export async function reorderBanners(items: ReorderBannersInput['items']) {
  const ids = items.map((i) => i.id);
  const existing = await prisma.banner.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (existing.length !== ids.length) {
    throw ApiError.badRequest('One or more banners do not exist');
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.banner.update({ where: { id: item.id }, data: { displayOrder: item.displayOrder } }),
    ),
  );
  return listAllBanners({ page: 1, limit: 100 });
}