import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import {
  OrderStatus,
  PaymentStatus,
  AuditAction,
  AuditActorType,
} from '../../types/enums';
import { ApiError } from '../../utils/http';
import { toApiError } from '../../utils/prisma-errors';
import type {
  AddAdminNoteInput,
  AdminListOrdersQuery,
  CancelOrderInput,
  CreateOrderInput,
  PaginationQuery,
  ReturnRequestInput,
  UpdateOrderStatusInput,
  UpdatePaymentStatusInput,
} from './schema';

type PrismaTx = Prisma.TransactionClient;

const orderDetailSelect = {
  id: true,
  orderNumber: true,
  userId: true,
  status: true,
  paymentStatus: true,
  currency: true,
  subtotal: true,
  discount: true,
  tax: true,
  deliveryFee: true,
  grandTotal: true,
  couponId: true,
  coupon: { select: { id: true, code: true } },
  addressSnapshot: true,
  notes: true,
  cancelReason: true,
  cancelledAt: true,
  deliveredAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { email: true, name: true } },
  items: {
    orderBy: { id: 'asc' as const },
    select: {
      id: true,
      productId: true,
      productName: true,
      productSlug: true,
      sku: true,
      unit: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
      imageUrl: true,
    },
  },
  payments: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      provider: true,
      amount: true,
      status: true,
      providerRefId: true,
      paidAt: true,
      createdAt: true,
    },
  },
  returnRequests: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      productId: true,
      reason: true,
      status: true,
      refundAmount: true,
      resolvedAt: true,
      createdAt: true,
    },
  },
} satisfies Prisma.OrderSelect;

type OrderDetail = Prisma.OrderGetPayload<{ select: typeof orderDetailSelect }>;

function fmtMoney(value: Prisma.Decimal | number): string {
  return new Prisma.Decimal(value).toFixed(2);
}

function buildOrderView(order: OrderDetail) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotal: fmtMoney(order.subtotal),
    discount: fmtMoney(order.discount),
    tax: fmtMoney(order.tax),
    deliveryFee: fmtMoney(order.deliveryFee),
    grandTotal: fmtMoney(order.grandTotal),
    coupon: order.coupon ? { id: order.coupon.id, code: order.coupon.code } : null,
    address: order.addressSnapshot,
    notes: order.notes,
    cancelReason: order.cancelReason,
    cancelledAt: order.cancelledAt,
    deliveredAt: order.deliveredAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: order.user ? { email: order.user.email, name: order.user.name } : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      sku: item.sku,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: fmtMoney(item.unitPrice),
      lineTotal: fmtMoney(item.lineTotal),
      imageUrl: item.imageUrl,
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      amount: fmtMoney(payment.amount),
      status: payment.status,
      providerRefId: payment.providerRefId,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    })),
    returnRequests: order.returnRequests.map((r) => ({
      id: r.id,
      productId: r.productId,
      reason: r.reason,
      status: r.status,
      refundAmount: r.refundAmount ? fmtMoney(r.refundAmount) : null,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
    })),
  };
}

async function loadOrderDetail(tx: PrismaTx | typeof prisma, id: string): Promise<OrderDetail> {
  const order = await tx.order.findUnique({ where: { id }, select: orderDetailSelect });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

function generateOrderNumber(): string {
  const now = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SP-${stamp}-${suffix}`;
}

async function resolveAddressSnapshot(userId: string, input: CreateOrderInput) {
  if (input.addressId) {
    const address = await prisma.address.findFirst({ where: { id: input.addressId, userId } });
    if (!address) throw ApiError.notFound('Address not found');
    return {
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? undefined,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
    };
  }
  if (input.address) {
    return { ...input.address, label: input.address.label ?? 'Home' };
  }
  throw ApiError.badRequest('Provide either an address object or an addressId');
}

export interface CouponApplicable {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: Prisma.Decimal;
  maxDiscount: Prisma.Decimal | null;
  discount: Prisma.Decimal;
}

export function computeCouponDiscount(
  coupon: { type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: Prisma.Decimal | number; maxDiscount: Prisma.Decimal | number | null },
  subtotal: Prisma.Decimal,
): { discount: Prisma.Decimal } {
  const value = new Prisma.Decimal(coupon.value);
  let discount: Prisma.Decimal;
  if (coupon.type === 'PERCENTAGE') {
    discount = subtotal.mul(value).div(100);
    if (coupon.maxDiscount != null) {
      const cap = new Prisma.Decimal(coupon.maxDiscount);
      discount = Prisma.Decimal.min(discount, cap);
    }
  } else {
    discount = Prisma.Decimal.min(value, subtotal);
  }
  discount = discount.gt(0) ? discount : new Prisma.Decimal(0);
  return { discount };
}

async function assertCouponEligible(
  tx: PrismaTx,
  coupon: {
    id: string;
    startAt: Date | null;
    endAt: Date | null;
    minOrderValue: Prisma.Decimal | null;
    usageLimit: number | null;
    perUserLimit: number | null;
  },
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
    const used = await tx.couponUsage.count({ where: { couponId: coupon.id } });
    if (used >= coupon.usageLimit) {
      throw ApiError.conflict('This coupon has reached its usage limit');
    }
  }
  if (coupon.perUserLimit != null && coupon.perUserLimit > 0) {
    const usedByUser = await tx.couponUsage.count({
      where: { couponId: coupon.id, userId },
    });
    if (usedByUser >= coupon.perUserLimit) {
      throw ApiError.conflict('You have already used this coupon the maximum number of times');
    }
  }
}

async function loadValidCoupon(tx: PrismaTx, code: string) {
  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    throw ApiError.notFound('Coupon not found or inactive');
  }
  return coupon;
}

async function reserveStock(tx: PrismaTx, productId: string, quantity: number): Promise<void> {
  const updated = await tx.$executeRaw`
    UPDATE "InventoryItem"
    SET "reservedQuantity" = "reservedQuantity" + ${quantity}
    WHERE "productId" = ${productId}
      AND ("quantity" - "reservedQuantity") >= ${quantity}
  `;
  if (updated === 0) {
    throw ApiError.conflict('Insufficient stock to reserve the item');
  }
}

async function sellStock(tx: PrismaTx, productId: string, quantity: number): Promise<void> {
  await tx.$executeRaw`
    UPDATE "InventoryItem"
    SET "quantity" = "quantity" - ${quantity}, "reservedQuantity" = "reservedQuantity" - ${quantity}
    WHERE "productId" = ${productId} AND "reservedQuantity" >= ${quantity}
  `;
}

async function releaseReservation(tx: PrismaTx, productId: string, quantity: number): Promise<void> {
  await tx.$executeRaw`
    UPDATE "InventoryItem"
    SET "reservedQuantity" = "reservedQuantity" - ${quantity}
    WHERE "productId" = ${productId} AND "reservedQuantity" >= ${quantity}
  `;
}

async function restock(tx: PrismaTx, productId: string, quantity: number): Promise<void> {
  await tx.$executeRaw`
    UPDATE "InventoryItem"
    SET "quantity" = "quantity" + ${quantity}
    WHERE "productId" = ${productId}
  `;
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true, items: { select: { productId: true, quantity: true, unit: true } } },
  });
  if (!cart || cart.items.length === 0) {
    throw ApiError.conflict('Cart is empty');
  }

  const addressSnapshot = await resolveAddressSnapshot(userId, input);

  try {
    const orderId = await prisma.$transaction(async (tx) => {
      const productIds = cart.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, slug: true, sku: true, basePrice: true, isActive: true, isApproved: true },
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      const lines = cart.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product || !product.isActive || !product.isApproved) {
          throw ApiError.conflict('One or more products are no longer available for purchase');
        }
        const unitPrice = new Prisma.Decimal(product.basePrice);
        return {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          sku: product.sku,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice,
          lineTotal: unitPrice.mul(item.quantity),
        };
      });

      const inventoryRows = await tx.inventoryItem.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, quantity: true, reservedQuantity: true },
      });
      const stockById = new Map(inventoryRows.map((r) => [r.productId, r]));
      const shortages: string[] = [];
      for (const line of lines) {
        const stock = stockById.get(line.productId);
        const available = stock ? Math.max(0, stock.quantity - stock.reservedQuantity) : 0;
        if (available < line.quantity) {
          shortages.push(`"${line.productName}" (only ${available} available)`);
        }
      }
      if (shortages.length > 0) {
        throw ApiError.conflict(`Insufficient stock: ${shortages.join(', ')}`);
      }

      const subtotal = lines.reduce((acc, line) => acc.add(line.lineTotal), new Prisma.Decimal(0));
      const tax = new Prisma.Decimal(0);
      const deliveryFee = new Prisma.Decimal(0);

      let couponId: string | null = null;
      let discount = new Prisma.Decimal(0);
      if (input.couponCode) {
        const coupon = await loadValidCoupon(tx, input.couponCode);
        await assertCouponEligible(tx, coupon, userId, subtotal);
        couponId = coupon.id;
        discount = computeCouponDiscount(coupon, subtotal).discount;
      }

      let grandTotal = subtotal.sub(discount).add(tax).add(deliveryFee);
      if (grandTotal.lt(0)) grandTotal = new Prisma.Decimal(0);

      let order: { id: string } | undefined;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          order = await tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              userId,
              subtotal,
              discount,
              tax,
              deliveryFee,
              grandTotal,
              couponId,
              addressSnapshot: addressSnapshot as object,
              items: {
                create: lines.map((line) => ({
                  productId: line.productId,
                  productName: line.productName,
                  productSlug: line.productSlug,
                  sku: line.sku,
                  unit: line.unit,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  lineTotal: line.lineTotal,
                })),
              },
            },
            select: { id: true },
          });
          break;
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            if (attempt === 2) throw err;
            continue;
          }
          throw err;
        }
      }
      if (!order) {
        throw new Error('Could not allocate an order number');
      }

      for (const line of lines) {
        await reserveStock(tx, line.productId, line.quantity);
      }

      if (couponId) {
        await tx.couponUsage.create({ data: { couponId, userId, orderId: order.id } });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order.id;
    });

    return buildOrderView(await loadOrderDetail(prisma, orderId));
  } catch (err) {
    throw toApiError(err, { resource: 'Order' });
  }
}

export async function listMyOrders(userId: string, query: PaginationQuery) {
  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      select: orderDetailSelect,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return {
    items: orders.map(buildOrderView),
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  };
}

export async function getMyOrder(userId: string, id: string) {
  const order = await prisma.order.findFirst({ where: { id, userId }, select: orderDetailSelect });
  if (!order) throw ApiError.notFound('Order not found');
  return buildOrderView(order);
}

export async function cancelOrder(userId: string, id: string, input: CancelOrderInput) {
  const order = await prisma.order.findFirst({
    where: { id, userId },
    select: { id: true, status: true, paymentStatus: true, items: { select: { productId: true, quantity: true } } },
  });
  if (!order) throw ApiError.notFound('Order not found');

  if (order.status === OrderStatus.CANCELLED) {
    return getMyOrder(userId, id);
  }

  const cancelable: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING];
  if (!cancelable.includes(order.status)) {
    throw ApiError.conflict(`Order cannot be cancelled in ${order.status} status`);
  }
  if (order.paymentStatus !== PaymentStatus.PENDING && order.paymentStatus !== PaymentStatus.FAILED) {
    throw ApiError.conflict('This order has been paid; request a return or contact support instead');
  }

  const sold = order.status !== OrderStatus.PENDING;

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (!item.productId) continue;
      if (sold) {
        await restock(tx, item.productId, item.quantity);
      } else {
        await releaseReservation(tx, item.productId, item.quantity);
      }
    }
    await tx.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), cancelReason: input.reason ?? null },
    });
  });

  return getMyOrder(userId, id);
}

export async function requestReturn(userId: string, id: string, input: ReturnRequestInput) {
  const order = await prisma.order.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      items: { select: { productId: true } },
      returnRequests: { select: { productId: true, status: true } },
    },
  });
  if (!order) throw ApiError.notFound('Order not found');

  if (order.status !== OrderStatus.DELIVERED) {
    if (order.status === OrderStatus.RETURN_REQUESTED) {
      throw ApiError.conflict('A return has already been requested for this order');
    }
    if (order.status === OrderStatus.RETURNED) {
      throw ApiError.conflict('This order has already been returned');
    }
    throw ApiError.conflict('Return can only be requested after the order is delivered');
  }

  const productId = input.productId ?? null;
  if (productId && !order.items.some((i) => i.productId === productId)) {
    throw ApiError.badRequest('The product does not belong to this order');
  }
  if (order.returnRequests.some((r) => r.productId === productId && r.status === 'REQUESTED')) {
    throw ApiError.conflict('A return has already been requested for this product');
  }

  await prisma.returnRequest.create({
    data: { orderId: id, productId, reason: input.reason },
  });
  await prisma.order.update({ where: { id }, data: { status: OrderStatus.RETURN_REQUESTED } });

  return getMyOrder(userId, id);
}

export async function getInvoiceForUser(userId: string, id: string) {
  const view = await getMyOrder(userId, id);
  return { invoiceNumber: view.orderNumber, issuedAt: new Date().toISOString(), order: view };
}

export async function listOrders(query: AdminListOrdersQuery) {
  const where: Prisma.OrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.q
      ? {
          OR: [
            { orderNumber: { contains: query.q, mode: 'insensitive' as const } },
            { user: { email: { contains: query.q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: orderDetailSelect,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    items: orders.map(buildOrderView),
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  };
}

export async function getOrderForAdmin(id: string) {
  return buildOrderView(await loadOrderDetail(prisma, id));
}

export async function getInvoiceForAdmin(id: string) {
  const view = await getOrderForAdmin(id);
  return { invoiceNumber: view.orderNumber, issuedAt: new Date().toISOString(), order: view };
}

const ORDER_TRANSITIONS: Record<string, readonly OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURN_REQUESTED, OrderStatus.RETURNED],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURNED, OrderStatus.CANCELLED],
  [OrderStatus.RETURNED]: [],
  [OrderStatus.CANCELLED]: [],
};

export async function updateOrderStatus(
  adminId: string | null,
  id: string,
  input: UpdateOrderStatusInput,
  requestId?: string,
) {
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      items: { select: { productId: true, quantity: true } },
    },
  });
  if (!order) throw ApiError.notFound('Order not found');

  const to = input.status;
  if (to === order.status) {
    return getOrderForAdmin(id);
  }

  const allowed = ORDER_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(to)) {
    throw ApiError.conflict(`Order cannot move from ${order.status} to ${to}`);
  }

  const from = order.status;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const items = order.items.filter((i) => i.productId);

    if (from === OrderStatus.PENDING && to === OrderStatus.CONFIRMED) {
      for (const item of items) await sellStock(tx, item.productId as string, item.quantity);
    } else if (to === OrderStatus.CANCELLED) {
      if (from === OrderStatus.PENDING) {
        for (const item of items) await releaseReservation(tx, item.productId as string, item.quantity);
      } else if (from === OrderStatus.CONFIRMED || from === OrderStatus.PROCESSING) {
        for (const item of items) await restock(tx, item.productId as string, item.quantity);
      }
    } else if (to === OrderStatus.RETURNED && (from === OrderStatus.DELIVERED || from === OrderStatus.RETURN_REQUESTED)) {
      for (const item of items) await restock(tx, item.productId as string, item.quantity);
      await tx.returnRequest.updateMany({
        where: { orderId: id },
        data: { status: 'RETURNED', resolvedAt: now },
      });
    }

    await tx.order.update({
      where: { id },
      data: {
        status: to,
        ...(to === OrderStatus.CANCELLED ? { cancelledAt: now, cancelReason: input.reason ?? null } : {}),
        ...(to === OrderStatus.DELIVERED ? { deliveredAt: now } : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        actorType: AuditActorType.ADMIN,
        actorId: adminId ?? undefined,
        action: AuditAction.ORDER_STATUS_CHANGED,
        resource: `order:${id}`,
        requestId,
        summary: `Order status ${from} -> ${to}`,
        metadata: { from, to, reason: input.reason ?? null },
      },
    });
  });

  return getOrderForAdmin(id);
}

const PAYMENT_TRANSITIONS: Record<string, readonly PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.FAILED],
  [PaymentStatus.FAILED]: [PaymentStatus.PAID],
  [PaymentStatus.PAID]: [PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED],
  [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED],
  [PaymentStatus.REFUNDED]: [],
};

export async function updateOrderPaymentStatus(
  adminId: string | null,
  id: string,
  input: UpdatePaymentStatusInput,
  requestId?: string,
) {
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, paymentStatus: true } });
  if (!order) throw ApiError.notFound('Order not found');

  const to = input.paymentStatus;
  if (to === order.paymentStatus) {
    return getOrderForAdmin(id);
  }

  const allowed = PAYMENT_TRANSITIONS[order.paymentStatus] ?? [];
  if (!allowed.includes(to)) {
    throw ApiError.conflict(`Payment status cannot move from ${order.paymentStatus} to ${to}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { paymentStatus: to } });

    if (to === PaymentStatus.PAID) {
      await tx.payment.updateMany({
        where: { orderId: id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        actorType: AuditActorType.ADMIN,
        actorId: adminId ?? undefined,
        action: AuditAction.ORDER_STATUS_CHANGED,
        resource: `order:${id}`,
        requestId,
        summary: `Payment status ${order.paymentStatus} -> ${to}`,
        metadata: { from: order.paymentStatus, to },
      },
    });
  });

  return getOrderForAdmin(id);
}

export async function addOrderNote(adminId: string | null, id: string, input: AddAdminNoteInput) {
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, notes: true } });
  if (!order) throw ApiError.notFound('Order not found');

  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const note = `[${stamp}] ${input.note}`;
  const notes = order.notes ? `${order.notes}\n${note}` : note;

  await prisma.order.update({ where: { id }, data: { notes } });
  return getOrderForAdmin(id);
}