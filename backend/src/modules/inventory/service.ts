import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { InventoryTransactionType } from '../../types/enums';
import { AuditAction, AuditActorType } from '../../types/enums';
import { ApiError } from '../../utils/http';
import type { AdjustStockInput, ListInventoryQuery, TransactionsQuery } from './schema';

const inventorySelect = {
  productId: true,
  quantity: true,
  reservedQuantity: true,
  lowStockThreshold: true,
} as const;

export async function listInventory(query: ListInventoryQuery) {
  const where = query.q
    ? {
        product: {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' as const } },
            { sku: { contains: query.q, mode: 'insensitive' as const } },
          ],
        },
      }
    : {};

  const [total, items] = await Promise.all([
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.findMany({
      where,
      select: {
        ...inventorySelect,
        product: { select: { id: true, name: true, slug: true, sku: true, unit: true, isActive: true, isApproved: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    items: items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
      available: Math.max(0, item.quantity - item.reservedQuantity),
      lowStockThreshold: item.lowStockThreshold,
      isLowStock: item.quantity - item.reservedQuantity <= item.lowStockThreshold,
    })),
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  };
}

export async function listLowStock() {
  const items = await prisma.inventoryItem.findMany({
    select: {
      ...inventorySelect,
      product: { select: { id: true, name: true, slug: true, sku: true, unit: true, isActive: true } },
    },
    orderBy: { quantity: 'asc' },
  });

  return items
    .map((item) => ({
      product: item.product,
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
      available: Math.max(0, item.quantity - item.reservedQuantity),
      lowStockThreshold: item.lowStockThreshold,
    }))
    .filter((item) => item.available <= item.lowStockThreshold)
    .sort((a, b) => a.available - b.available);
}

/**
 * Manually adjust a product's stock. Positive deltas add units (stock-in,
 * correction up); negative deltas remove units (damage, correction down, sale
 * booked out-of-band). The adjustment is atomic and never dips below units
 * already reserved by orders. Every change is recorded as an
 * InventoryTransaction and an audit event.
 */
export async function adjustStock(
  adminId: string | null,
  productId: string,
  input: AdjustStockInput,
  requestId?: string,
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, sku: true },
  });
  if (!product) throw ApiError.notFound('Product not found');
  if (!product.sku) throw ApiError.unprocessable('Product has no SKU; cannot adjust inventory');

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (input.delta >= 0) {
      await tx.$executeRaw`
        UPDATE "InventoryItem"
        SET "quantity" = "quantity" + ${input.delta},
            "lastAdjustedAt" = ${now}
        WHERE "productId" = ${productId}
      `;
    } else {
      const updated = await tx.$executeRaw`
        UPDATE "InventoryItem"
        SET "quantity" = "quantity" + ${input.delta},
            "lastAdjustedAt" = ${now}
        WHERE "productId" = ${productId}
          AND "quantity" + ${input.delta} >= "reservedQuantity"
      `;
      if (updated === 0) {
        throw ApiError.conflict('Adjustment would take stock below units already reserved by orders');
      }
    }

    await tx.inventoryTransaction.create({
      data: {
        productId,
        adminId: adminId ?? undefined,
        type: InventoryTransactionType.ADJUSTMENT,
        delta: input.delta,
        note: input.note ?? input.reason,
      },
    });

    await tx.auditLog.create({
      data: {
        actorType: AuditActorType.ADMIN,
        actorId: adminId ?? undefined,
        action: AuditAction.STOCK_CHANGED,
        resource: `product:${productId}`,
        requestId,
        summary: `Inventory adjusted by ${input.delta} (${input.reason})`,
        metadata: { delta: input.delta, reason: input.reason, note: input.note ?? null },
      },
    });
  });

  return getInventoryView(productId);
}

async function getInventoryView(productId: string) {
  const item = await prisma.inventoryItem.findUnique({
    where: { productId },
    select: {
      ...inventorySelect,
      product: { select: { id: true, name: true, slug: true, sku: true, unit: true } },
    },
  });
  if (!item) throw ApiError.notFound('Inventory item not found');
  return {
    product: item.product,
    quantity: item.quantity,
    reservedQuantity: item.reservedQuantity,
    available: Math.max(0, item.quantity - item.reservedQuantity),
    lowStockThreshold: item.lowStockThreshold,
  };
}

export async function listTransactions(productId: string, query: TransactionsQuery) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, sku: true } });
  if (!product) throw ApiError.notFound('Product not found');

  const [total, transactions] = await Promise.all([
    prisma.inventoryTransaction.count({ where: { productId } }),
    prisma.inventoryTransaction.findMany({
      where: { productId },
      select: {
        id: true,
        type: true,
        delta: true,
        note: true,
        orderId: true,
        admin: { select: { id: true, name: true, email: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    product: { id: product.id, name: product.name, sku: product.sku },
    items: transactions,
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  };
}