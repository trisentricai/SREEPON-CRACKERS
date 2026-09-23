import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/infrastructure/prisma';
import { findOrCreateFromFirebase } from '../src/modules/auth/service';
import * as cartService from '../src/modules/cart/service';
import * as ordersService from '../src/modules/orders/service';
import * as paymentsService from '../src/modules/payments/service';
import * as couponsService from '../src/modules/coupons/service';

/**
 * Phase 5 commerce tests against a real database.
 * Controllers are thin wrappers over these services (the auth/webhook guard
 * contracts are verified in the DB-free suite); here the business logic —
 * poduct pricing, stock reservation/sell/release/restock, coupon savings and
 * redemption ledger, HMAC-verified webhook payments — is exercised directly
 * with seeded users, products and coupons.
 */
const hasDB = Boolean(process.env.DATABASE_URL);
const MOCK_WEBHOOK_SECRET = 'sripon-mock-pay-dev-secret';

function mockSignature(body: unknown): string {
  return createHmac('sha256', MOCK_WEBHOOK_SECRET).update(Buffer.from(JSON.stringify(body))).digest('hex');
}

function mockWebhook(payload: Record<string, unknown>) {
  return paymentsService.handleWebhook('mock', Buffer.from(JSON.stringify(payload)), {
    'x-sripon-signature': mockSignature(payload),
  });
}

describe.skipIf(!hasDB)('commerce against a real database', () => {
  const stamp = Date.now();
  let buyerUserId = '';
  const productId = randomUUID();
  const couponIds: string[] = [];
  const orderIds: string[] = [];

  const address = {
    fullName: 'Buyer Person',
    phone: '9999999999',
    line1: '5th Street',
    city: 'Chennai',
    state: 'TN',
    pincode: '600001',
    country: 'IN',
  };

  // Keeps the shared product independent between scenarios — every test starts
  // from a known 10-in-stock / 0-reserved baseline regardless of what earlier
  // tests reserved, sold, released or restocked.
  async function resetStock() {
    await prisma.product.upsert({
      where: { id: productId },
      update: { inventory: { update: { quantity: 10, reservedQuantity: 0 } } },
      create: {
        id: productId,
        name: `Commerce Product ${stamp}`,
        slug: `commerce-product-${stamp}`,
        sku: `COMM-${stamp}`,
        basePrice: 1250,
        unit: 'BOX',
        isActive: true,
        isApproved: true,
        inventory: { create: { quantity: 10 } },
      },
    });
  }

  beforeAll(async () => {
    const { user } = await findOrCreateFromFirebase({
      uid: `it-commerce-${stamp}`,
      email: `commerce-${stamp}@example.com`,
      name: 'Buyer Person',
    });
    buyerUserId = user.id;
    await resetStock();
  });

  afterAll(async () => {
    const toDelete = orderIds.length > 0 ? { in: orderIds } : undefined;
    if (toDelete) {
      await prisma.payment.deleteMany({ where: { orderId: toDelete } });
      await prisma.returnRequest.deleteMany({ where: { orderId: toDelete } });
    }
    await prisma.couponUsage.deleteMany({
      where: { OR: [{ userId: buyerUserId }, ...(couponIds.length > 0 ? [{ couponId: { in: couponIds } }] : [])] },
    });
    if (couponIds.length > 0) await prisma.coupon.deleteMany({ where: { id: { in: couponIds } } });
    if (toDelete) {
      await prisma.auditLog.deleteMany({ where: { resource: { in: orderIds.map((id) => `order:${id}`) } } });
      await prisma.order.deleteMany({ where: { id: toDelete } });
    }
    await prisma.cartItem.deleteMany({ where: { cart: { userId: buyerUserId } } });
    await prisma.inventoryItem.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.user.deleteMany({ where: { id: buyerUserId } });
  });

  async function readyCart(quantity = 2) {
    await cartService.clearCart(buyerUserId);
    await cartService.addItem(buyerUserId, { productId, quantity, unit: 'BOX' });
  }

  async function stockRow() {
    return prisma.inventoryItem.findUniqueOrThrow({ where: { productId } });
  }

  it('places an order: backend-priced, stock reserved, cart cleared, immutable address snapshot', async () => {
    await resetStock();
    await readyCart(2);

    const order = await ordersService.createOrder(buyerUserId, { address });
    orderIds.push(order.id);

    expect(order.orderNumber).toMatch(/^SP-\d{8}-\d{6}-[A-Z0-9]{4}$/);
    expect(order.status).toBe('PENDING');
    expect(order.paymentStatus).toBe('PENDING');
    expect(order.subtotal).toBe('2500.00');
    expect(order.grandTotal).toBe('2500.00');
    expect(order.currency).toBe('INR');
    expect(order.coupon).toBeNull();
    expect(order.items).toHaveLength(1);
    expect(order.items[0]!.quantity).toBe(2);
    expect(order.items[0]!.unitPrice).toBe('1250.00');
    expect(order.items[0]!.lineTotal).toBe('2500.00');
    expect(order.address).toMatchObject({ fullName: 'Buyer Person', pincode: '600001' });

    const stock = await stockRow();
    expect(stock.quantity).toBe(10);
    expect(stock.reservedQuantity).toBe(2);

    expect((await cartService.getCart(buyerUserId)).items).toHaveLength(0);

    const invoice = await ordersService.getInvoiceForUser(buyerUserId, order.id);
    expect(invoice.invoiceNumber).toBe(order.orderNumber);

    const mine = await ordersService.listMyOrders(buyerUserId, { page: 1, limit: 20 });
    expect(mine.items.some((o) => o.id === order.id)).toBe(true);
  });

  it('rejects an empty-cart checkouts and naive float prices are never accepted', async () => {
    await cartService.clearCart(buyerUserId);
    await expect(ordersService.createOrder(buyerUserId, { address })).rejects.toMatchObject({ status: 409 });
  });

  it('applies a percentage coupon with a minimum order and records the redemption', async () => {
    await resetStock();
    const coupon = await couponsService.createCoupon({
      code: `P10-${stamp}`,
      type: 'PERCENTAGE',
      value: 10,
      minOrderValue: 1000,
      perUserLimit: 1,
      isActive: true,
    });
    couponIds.push(coupon.id);

    await readyCart(2);
    const validated = await couponsService.validateCoupon(buyerUserId, {
      code: coupon.code,
      orderSubtotal: 2500,
    });
    expect(validated.discount).toBe('250.00');
    expect(validated.finalTotal).toBe('2250.00');
    expect(validated.coupon.usedCount).toBe(0);

    const order = await ordersService.createOrder(buyerUserId, { address, couponCode: coupon.code });
    orderIds.push(order.id);
    expect(order.coupon).toMatchObject({ id: coupon.id, code: coupon.code });
    expect(order.discount).toBe('250.00');
    expect(order.subtotal).toBe('2500.00');
    expect(order.grandTotal).toBe('2250.00');

    const after = await couponsService.getCoupon(coupon.id);
    expect(after.usedCount).toBe(1);

    // perUserLimit = 1 → the same user cannot use it again.
    await readyCart(2);
    await expect(
      ordersService.createOrder(buyerUserId, { address, couponCode: coupon.code }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('enforces the coupon usage limit across users', async () => {
    await resetStock();
    const coupon = await couponsService.createCoupon({
      code: `LMT-${stamp}`,
      type: 'FIXED_AMOUNT',
      value: 100,
      usageLimit: 1,
      perUserLimit: 1,
      isActive: true,
    });
    couponIds.push(coupon.id);

    await readyCart(2);
    const order = await ordersService.createOrder(buyerUserId, { address, couponCode: coupon.code });
    orderIds.push(order.id);
    await readyCart(2);
    await expect(
      ordersService.createOrder(buyerUserId, { address, couponCode: coupon.code }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('cancels an unpaid PENDING order and releases the reservation', async () => {
    await resetStock();
    await readyCart(2);
    const order = await ordersService.createOrder(buyerUserId, { address });
    orderIds.push(order.id);

    const cancelled = await ordersService.cancelOrder(buyerUserId, order.id, { reason: 'changed mind' });
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelReason).toBe('changed mind');
    expect((await stockRow()).reservedQuantity).toBe(0);

    // Idempotent cancel returns the cancelled order.
    const again = await ordersService.cancelOrder(buyerUserId, order.id, {});
    expect(again.status).toBe('CANCELLED');
  });

  it('allows a return request only for a delivered order', async () => {
    await resetStock();
    await readyCart(1);
    const order = await ordersService.createOrder(buyerUserId, { address });
    orderIds.push(order.id);

    await expect(ordersService.requestReturn(buyerUserId, order.id, { reason: 'damaged' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('createPayment re-uses an in-flight intent and exposes a gateway client payload', async () => {
    await resetStock();
    await readyCart(1);
    const order = await ordersService.createOrder(buyerUserId, { address });
    orderIds.push(order.id);

    const first = await paymentsService.createPayment(buyerUserId, { orderId: order.id, provider: 'mock' });
    expect(first.providerRefId).toMatch(/^mock_/);
    expect(first.status).toBe('PENDING');
    if ('clientPayload' in first) {
      expect(first.clientPayload.provider).toBe('mock');
    }

    const second = await paymentsService.createPayment(buyerUserId, { orderId: order.id, provider: 'mock' });
    expect(second.id).toBe(first.id);

    const cash = await paymentsService.createPayment(buyerUserId, { orderId: order.id, provider: 'cash' });
    expect(cash.provider).toBe('cash');
    expect(cash.providerRefId).toBeNull();
  });

  it('only a signature-verified webhook can mark a payment paid (with idempotency)', async () => {
    await resetStock();
    await readyCart(1);
    const order = await ordersService.createOrder(buyerUserId, { address });
    orderIds.push(order.id);

    const payment = await paymentsService.createPayment(buyerUserId, { orderId: order.id, provider: 'mock' });

    await expect(
      paymentsService.handleWebhook('mock', Buffer.from(JSON.stringify({ providerRefId: payment.providerRefId, success: true })), {}),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      paymentsService.handleWebhook('mock', Buffer.from(JSON.stringify({ providerRefId: payment.providerRefId, success: true })), {
        'x-sripon-signature': 'deadbeef',
      }),
    ).rejects.toMatchObject({ status: 401 });

    const paid = await mockWebhook({ providerRefId: payment.providerRefId, success: true });
    expect(paid.status).toBe('PAID');
    expect(paid.paidAt).toBeInstanceOf(Date);

    const dbOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(dbOrder.paymentStatus).toBe('PAID');

    const repeat = await mockWebhook({ providerRefId: payment.providerRefId, success: true });
    expect(repeat.status).toBe('PAID');

    // A paid order cannot be cancelled.
    await expect(ordersService.cancelOrder(buyerUserId, order.id, {})).rejects.toMatchObject({ status: 409 });
  });

  it('rejects an amount mismatch and marks failed webhooks as FAILED', async () => {
    await resetStock();
    await readyCart(1);
    const order = await ordersService.createOrder(buyerUserId, { address });
    orderIds.push(order.id);
    const payment = await paymentsService.createPayment(buyerUserId, { orderId: order.id, provider: 'mock' });

    await expect(
      mockWebhook({ providerRefId: payment.providerRefId, success: true, amount: '999.00' }),
    ).rejects.toMatchObject({ status: 409 });

    const failed = await mockWebhook({ providerRefId: payment.providerRefId, success: false });
    expect(failed.status).toBe('FAILED');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe('PENDING');
  });

  it('advances the lifecycle with stock sell/release/restock and audit logs', async () => {
    await resetStock();
    await readyCart(2);
    const order = await ordersService.createOrder(buyerUserId, { address });
    orderIds.push(order.id);

    const confirmed = await ordersService.updateOrderStatus(null, order.id, { status: 'CONFIRMED' });
    expect(confirmed.status).toBe('CONFIRMED');
    expect((await stockRow()).quantity).toBe(8);
    expect((await stockRow()).reservedQuantity).toBe(0);

    const auditCount = await prisma.auditLog.count({
      where: { resource: `order:${order.id}`, action: 'ORDER_STATUS_CHANGED' },
    });
    expect(auditCount).toBe(1);

    const cancelled = await ordersService.updateOrderStatus(null, order.id, { status: 'CANCELLED' });
    expect(cancelled.status).toBe('CANCELLED');
    expect((await stockRow()).quantity).toBe(10);
  });

  it('rejects invalid admin transitions and out-of-order payment statuses', async () => {
    await resetStock();
    await readyCart(1);
    const order = await ordersService.createOrder(buyerUserId, { address });
    orderIds.push(order.id);

    await expect(
      ordersService.updateOrderStatus(null, order.id, { status: 'DELIVERED' }),
    ).rejects.toMatchObject({ status: 409 });

    await expect(
      ordersService.updateOrderPaymentStatus(null, order.id, { paymentStatus: 'REFUNDED' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('lets an admin mark an offline payment paid and append a timestamped note', async () => {
    await resetStock();
    await readyCart(1);
    const order = await ordersService.createOrder(buyerUserId, { address });
    orderIds.push(order.id);
    await paymentsService.createPayment(buyerUserId, { orderId: order.id, provider: 'cash' });

    const updated = await ordersService.updateOrderPaymentStatus(null, order.id, { paymentStatus: 'PAID' });
    expect(updated.paymentStatus).toBe('PAID');
    expect(updated.payments[0]!.status).toBe('PAID');

    const noted = await ordersService.addOrderNote(null, order.id, { note: 'paid over the counter' });
    expect(noted.notes).toMatch(/^\s*\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] paid over the counter$/);
  });

  it(
    'runs a full delivered → return → restock flow',
    async () => {
      await resetStock();
      await readyCart(2);
      const order = await ordersService.createOrder(buyerUserId, { address });
      orderIds.push(order.id);

      for (const status of ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const) {
        await ordersService.updateOrderStatus(null, order.id, { status });
      }
      expect((await stockRow()).quantity).toBe(8);

      const returned = await ordersService.requestReturn(buyerUserId, order.id, { reason: 'not as described' });
      expect(returned.status).toBe('RETURN_REQUESTED');
      expect(returned.returnRequests).toHaveLength(1);
      expect(returned.returnRequests[0]!.reason).toBe('not as described');

      const closed = await ordersService.updateOrderStatus(null, order.id, { status: 'RETURNED' });
      expect(closed.status).toBe('RETURNED');
      expect(closed.returnRequests[0]!.status).toBe('RETURNED');
      expect((await stockRow()).quantity).toBe(10);
    },
    60000,
  );

  it('lets admins list and update coupons, then delete them', async () => {
    const created = await couponsService.createCoupon({
      code: `CRUD-${stamp}`,
      type: 'FIXED_AMOUNT',
      value: 50,
      perUserLimit: 1,
      isActive: true,
    });
    couponIds.push(created.id);

    const listed = await couponsService.listCoupons({ page: 1, limit: 20 });
    expect(listed.items.some((c) => c.id === created.id)).toBe(true);

    const updated = await couponsService.updateCoupon(created.id, { value: 75 });
    expect(updated.value).toBe('75.00');

    await couponsService.deleteCoupon(created.id);
    await expect(couponsService.getCoupon(created.id)).rejects.toMatchObject({ status: 404 });
  });
});