import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { ApiError } from '../../utils/http';
import { toApiError } from '../../utils/prisma-errors';
import { computeCouponDiscount } from '../orders/service';
import type {
  AdminListCouponsQuery,
  CreateCouponInput,
  UpdateCouponInput,
  ValidateCouponInput,
} from './schema';

const couponSelect = {
  id: true,
  code: true,
  type: true,
  value: true,
  maxDiscount: true,
  minOrderValue: true,
  usageLimit: true,
  perUserLimit: true,
  startAt: true,
  endAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { usages: true } },
} satisfies Prisma.CouponSelect;

type CouponRow = Prisma.CouponGetPayload<{ select: typeof couponSelect }>;

function fmtMoney(value: Prisma.Decimal | number): string {
  return new Prisma.Decimal(value).toFixed(2);
}

function buildCouponView(coupon: CouponRow) {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: fmtMoney(coupon.value),
    maxDiscount: coupon.maxDiscount ? fmtMoney(coupon.maxDiscount) : null,
    minOrderValue: coupon.minOrderValue ? fmtMoney(coupon.minOrderValue) : null,
    usageLimit: coupon.usageLimit,
    perUserLimit: coupon.perUserLimit,
    startAt: coupon.startAt,
    endAt: coupon.endAt,
    isActive: coupon.isActive,
    usedCount: coupon._count.usages,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

async function assertCouponEligibleDirect(
  coupon: CouponRow,
  userId: string,
  subtotal: Prisma.Decimal,
): Promise<void> {
  const now = new Date();
  if (coupon.startAt && coupon.startAt > now) {
    throw ApiError.conflict('This coupon is not active yet');
  }
  if (coupon.endAt && coupon.endAt < now) {
    throw ApiError.conflict('This coupon has expired');
  }
  if (coupon.minOrderValue != null && subtotal.lt(coupon.minOrderValue)) {
    throw ApiError.conflict(`Minimum order value of ${fmtMoney(coupon.minOrderValue)} required for this coupon`);
  }
  if (coupon.usageLimit != null && coupon.usageLimit > 0) {
    const used = await prisma.couponUsage.count({ where: { couponId: coupon.id } });
    if (used >= coupon.usageLimit) {
      throw ApiError.conflict('This coupon has reached its usage limit');
    }
  }
  if (coupon.perUserLimit != null && coupon.perUserLimit > 0) {
    const usedByUser = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (usedByUser >= coupon.perUserLimit) {
      throw ApiError.conflict('You have already used this coupon the maximum number of times');
    }
  }
}

export async function validateCoupon(userId: string, input: ValidateCouponInput) {
  const coupon = await prisma.coupon.findUnique({ where: { code: input.code }, select: couponSelect });
  if (!coupon || !coupon.isActive) {
    throw ApiError.notFound('Coupon not found or inactive');
  }

  const subtotal = new Prisma.Decimal(input.orderSubtotal);
  await assertCouponEligibleDirect(coupon, userId, subtotal);

  const { discount } = computeCouponDiscount(coupon, subtotal);
  return {
    coupon: buildCouponView(coupon),
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    finalTotal: subtotal.sub(discount).toFixed(2),
  };
}

export async function listCoupons(query: AdminListCouponsQuery) {
  const where: Prisma.CouponWhereInput = {
    ...(query.q ? { code: { contains: query.q, mode: 'insensitive' as const } } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.findMany({
      where,
      select: couponSelect,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    items: items.map(buildCouponView),
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  };
}

export async function createCoupon(input: CreateCouponInput) {
  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: input.code,
        type: input.type,
        value: input.value,
        maxDiscount: input.maxDiscount ?? null,
        minOrderValue: input.minOrderValue ?? null,
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit,
        startAt: input.startAt ?? null,
        endAt: input.endAt ?? null,
        isActive: input.isActive,
      },
      select: couponSelect,
    });
    return buildCouponView(coupon);
  } catch (err) {
    throw toApiError(err, { resource: 'Coupon' });
  }
}

export async function getCoupon(id: string) {
  const coupon = await prisma.coupon.findUnique({ where: { id }, select: couponSelect });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  return buildCouponView(coupon);
}

export async function updateCoupon(id: string, input: UpdateCouponInput) {
  const existing = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Coupon not found');

  try {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.value !== undefined ? { value: input.value } : {}),
        ...(input.maxDiscount !== undefined ? { maxDiscount: input.maxDiscount } : {}),
        ...(input.minOrderValue !== undefined ? { minOrderValue: input.minOrderValue } : {}),
        ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit } : {}),
        ...(input.perUserLimit !== undefined ? { perUserLimit: input.perUserLimit } : {}),
        ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
        ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: couponSelect,
    });
    return buildCouponView(coupon);
  } catch (err) {
    throw toApiError(err, { resource: 'Coupon' });
  }
}

export async function deleteCoupon(id: string) {
  const existing = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Coupon not found');

  try {
    await prisma.coupon.delete({ where: { id } });
  } catch (err) {
    throw toApiError(err, { resource: 'Coupon' });
  }
}