import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { PaymentStatus, OrderStatus } from '../../types/enums';
import type { AnalyticsQuery, CategoriesQuery, TopProductsQuery } from './schema';

function fmtMoney(value: Prisma.Decimal | number | string | null | undefined): string {
  if (value === null || value === undefined) return '0.00';
  return new Prisma.Decimal(value).toFixed(2);
}

type RowWithMoney = Record<string, unknown>;

function normalizeMoney(row: RowWithMoney, keys: string[]): RowWithMoney {
  const normalized = { ...row };
  for (const key of keys) {
    if (normalized[key] !== undefined && normalized[key] !== null) {
      normalized[key] = fmtMoney(normalized[key] as Prisma.Decimal);
    }
  }
  return normalized;
}

export async function dashboard() {
  const [revenueAgg, orderCount, paidOrderCount, customerCount, productCount, inventoryItems] =
    await Promise.all([
      prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID },
        _sum: { grandTotal: true },
        _avg: { grandTotal: true },
        _count: { id: true },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { paymentStatus: PaymentStatus.PAID } }),
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.inventoryItem.findMany({
        select: { quantity: true, reservedQuantity: true, lowStockThreshold: true },
      }),
    ]);

  const availableOf = (item: { quantity: number; reservedQuantity: number }) =>
    Math.max(0, item.quantity - item.reservedQuantity);

  const lowStockCount = inventoryItems.filter((item) => availableOf(item) <= item.lowStockThreshold).length;
  const outOfStockCount = inventoryItems.filter((item) => availableOf(item) < 1).length;

  const prevThirtyDays = new Date();
  prevThirtyDays.setDate(prevThirtyDays.getDate() - 30);

  const [newCustomers, pendingOrders] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: prevThirtyDays } } }),
    prisma.order.count({ where: { status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] } } }),
  ]);

  return {
    revenue: fmtMoney(revenueAgg._sum?.grandTotal ?? 0),
    paidOrders: paidOrderCount,
    averageOrderValue: fmtMoney(revenueAgg._avg?.grandTotal ?? 0),
    totalOrders: orderCount,
    customers: customerCount,
    newCustomersLast30Days: newCustomers,
    activeProducts: productCount,
    pendingOrdersCount: pendingOrders,
    outOfStockCount,
    lowStockCount,
  };
}

export async function revenueOverTime(query: AnalyticsQuery) {
  const days = `now() - interval '${query.days} days'`;
  const rows = await prisma.$queryRaw`
    SELECT date_trunc('day', "createdAt")::date AS day,
           COALESCE(SUM("grandTotal"), 0) AS revenue,
           COUNT(*)::int AS orders
    FROM "Order"
    WHERE "paymentStatus" = ${PaymentStatus.PAID}
      AND "createdAt" >= ${Prisma.raw(days)}
    GROUP BY day
    ORDER BY day ASC
  ` as RowWithMoney[];

  return rows.map((row) => normalizeMoney(row, ['revenue']));
}

export async function ordersOverTime(query: AnalyticsQuery) {
  const days = `now() - interval '${query.days} days'`;
  const rows = await prisma.$queryRaw`
    SELECT date_trunc('day', "createdAt")::date AS day,
           COUNT(*)::int AS orders,
           COALESCE(SUM(CASE WHEN "paymentStatus" = ${PaymentStatus.PAID} THEN 1 ELSE 0 END)::int, 0) AS paid,
           COALESCE(SUM(CASE WHEN "paymentStatus" IN (${PaymentStatus.PENDING}, ${PaymentStatus.FAILED}) THEN 1 ELSE 0 END)::int, 0) AS unpaid
    FROM "Order"
    WHERE "createdAt" >= ${Prisma.raw(days)}
    GROUP BY day
    ORDER BY day ASC
  ` as RowWithMoney[];

  return rows.map((row) => normalizeMoney(row, []));
}

export async function topProducts(query: TopProductsQuery) {
  const days = `now() - interval '${query.days} days'`;
  const rows = await prisma.$queryRaw`
    SELECT oi."productId"::text AS "productId",
           MAX(COALESCE(p.name, oi."productName")) AS name,
           MAX(COALESCE(p.sku, oi.sku)) AS sku,
           SUM(oi.quantity)::int AS units,
           SUM(oi."lineTotal") AS revenue
    FROM "OrderItem" oi
    LEFT JOIN "Order" o ON o.id = oi."orderId"
    LEFT JOIN "Product" p ON p.id = oi."productId"
    WHERE o."paymentStatus" = ${PaymentStatus.PAID}
      AND o."createdAt" >= ${Prisma.raw(days)}
    GROUP BY oi."productId"
    ORDER BY revenue DESC
    LIMIT ${query.limit}
  ` as RowWithMoney[];

  return rows.map((row) => normalizeMoney(row, ['revenue']));
}

export async function categoryPerformance(query: CategoriesQuery) {
  const days = `now() - interval '${query.days} days'`;
  const rows = await prisma.$queryRaw`
    SELECT c.id::text AS "categoryId",
           c.name AS name,
           c.slug AS slug,
           SUM(oi.quantity)::int AS units,
           SUM(oi."lineTotal") AS revenue
    FROM "OrderItem" oi
    LEFT JOIN "Order" o ON o.id = oi."orderId"
    LEFT JOIN "Product" p ON p.id = oi."productId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE o."paymentStatus" = ${PaymentStatus.PAID}
      AND o."createdAt" >= ${Prisma.raw(days)}
    GROUP BY c.id, c.name, c.slug
    ORDER BY revenue DESC NULLS LAST
    LIMIT 50
  ` as RowWithMoney[];

  return rows.map((row) => normalizeMoney(row, ['revenue'])).filter((row) => row.categoryId);
}