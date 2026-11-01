import type { IncomingHttpHeaders } from 'node:http';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { PaymentStatus, OrderStatus } from '../../types/enums';
import { ApiError } from '../../utils/http';
import { logger } from '../../utils/logger';
import { toApiError } from '../../utils/prisma-errors';
import { assertProviderConfigured, getProvider } from './provider';
import type { CreatePaymentInput } from './schema';

const paymentSelect = {
  id: true,
  orderId: true,
  provider: true,
  amount: true,
  status: true,
  providerRefId: true,
  paidAt: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

function buildPaymentView(payment: PaymentRow) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    amount: payment.amount.toFixed(2),
    status: payment.status,
    providerRefId: payment.providerRefId,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  };
}

/**
 * Create a (or re-use an in-flight) payment for an order. The amount is always
 * the order's stored grandTotal — the client never supplies a price.
 */
export type PaymentIntentView = ReturnType<typeof buildPaymentView> & {
  clientPayload?: Record<string, unknown>;
};

export async function createPayment(
  userId: string,
  input: CreatePaymentInput,
): Promise<PaymentIntentView> {
  const provider = getProvider(input.provider);
  assertProviderConfigured(provider);

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId },
    select: {
      id: true,
      orderNumber: true,
      grandTotal: true,
      paymentStatus: true,
      addressSnapshot: true,
      user: { select: { email: true, name: true, phone: true } },
    },
  });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentStatus === PaymentStatus.PAID) {
    throw ApiError.conflict('Order is already paid');
  }
  if (order.grandTotal.lte(0)) {
    throw ApiError.conflict('Order amount is zero; nothing to pay');
  }

  const existing = await prisma.payment.findFirst({
    where: { orderId: order.id, provider: provider.name, status: PaymentStatus.PENDING },
    select: paymentSelect,
  });
  // Cashfree needs a reachable phone (and ideally an email) on the order, so the
  // details captured for delivery are forwarded to the gateway.
  const snapshot = (order.addressSnapshot ?? {}) as Record<string, unknown>;
  const snapshotPhone = typeof snapshot.phone === 'string' ? snapshot.phone : null;
  const snapshotName = typeof snapshot.fullName === 'string' ? snapshot.fullName : null;

  const intentInput = {
    amount: order.grandTotal,
    currency: 'INR',
    orderNumber: order.orderNumber,
    orderId: order.id,
    customer: {
      name: snapshotName ?? order.user?.name ?? null,
      email: order.user?.email ?? null,
      phone: snapshotPhone ?? order.user?.phone ?? null,
    },
  };

  if (existing) {
    // Reopening an unpaid order: refresh the gateway hand-off instead of
    // returning a payment the client cannot launch.
    const clientPayload = provider.resumeIntent
      ? await provider.resumeIntent(intentInput).catch((err: unknown) => {
          logger.warn({ err }, 'failed to resume payment intent');
          return null;
        })
      : null;
    return { ...buildPaymentView(existing), ...(clientPayload ? { clientPayload } : {}) };
  }

  const intent = await provider.createIntent(intentInput);

  try {
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: provider.name,
        amount: order.grandTotal,
        providerRefId: intent.providerRefId,
      },
      select: paymentSelect,
    });
    return { ...buildPaymentView(payment), clientPayload: intent.clientPayload };
  } catch (err) {
    throw toApiError(err, { resource: 'Payment' });
  }
}

/**
 * Return a payment's current status to the owning customer.
 */
export async function getPayment(userId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, order: { userId } },
    select: {
      ...paymentSelect,
      order: { select: { status: true, notes: true } },
    },
  });
  if (!payment) throw ApiError.notFound('Payment not found');

  // A webhook can be delayed by a retry backlog, or never arrive when the
  // endpoint is not registered on the gateway yet. While the client polls, ask
  // the gateway directly and settle here — the webhook stays the primary path.
  if (payment.status === PaymentStatus.PENDING && payment.providerRefId) {
    const remote = await getProvider(payment.provider).fetchIntentStatus?.(payment.providerRefId);
    if (remote?.status === 'PAID') {
      if (remote.amount != null && !remote.amount.eq(payment.amount)) {
        logger.warn(
          { paymentId: payment.id, expected: payment.amount.toFixed(2), received: remote.amount.toFixed(2) },
          'gateway amount mismatch during reconciliation',
        );
        throw ApiError.conflict('Payment amount does not match the order');
      }
      await settlePaidPayment(payment, {
        source: 'status-reconcile',
        at: new Date().toISOString(),
      });
      const settled = await prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
        select: paymentSelect,
      });
      return buildPaymentView(settled);
    }
  }

  const { order: _order, ...view } = payment;
  return buildPaymentView(view);
}

type SettleablePayment = {
  id: string;
  orderId: string;
  amount: Prisma.Decimal;
  order: { status: OrderStatus; notes: string | null };
};

/**
 * Records a payment the gateway has confirmed as paid.
 *
 * A payment can arrive after the order was cancelled — by the customer, an
 * admin, or the scheduled expiry job that releases abandoned reservations.
 * The money is still real, so record it, but never resurrect the order: its
 * stock has been released and may already be sold to someone else. Leave a
 * note so the admin refunds it.
 */
async function settlePaidPayment(
  payment: SettleablePayment,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  if (payment.order.status === OrderStatus.CANCELLED) {
    logger.warn(
      { paymentId: payment.id, orderId: payment.orderId },
      'payment received for a cancelled order — refund required',
    );
    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const note = `[${stamp}] Payment of ${payment.amount.toFixed(2)} received after cancellation — refund required`;
    const notes = payment.order.notes ? `${payment.order.notes}\n${note}` : note;
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date(), webhookPayload: payload },
      }),
      prisma.order.update({ where: { id: payment.orderId }, data: { notes } }),
    ]);
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PAID, paidAt: new Date(), webhookPayload: payload },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: PaymentStatus.PAID },
    }),
  ]);
}

/**
 * Provider webhooks. The gateway signature is verified against the raw bytes of
 * the request body (never the parsed JSON), and a provider webhook is the only
 * thing allowed to mark a payment paid.
 */
export async function handleWebhook(
  providerName: string,
  rawBody: Buffer,
  headers: IncomingHttpHeaders,
) {
  const provider = getProvider(providerName);
  const event = await provider.verifyWebhook(rawBody, headers);

  if (!event.providerRefId) {
    throw ApiError.badRequest('Webhook does not reference a known payment');
  }

  const payment = await prisma.payment.findFirst({
    where: { provider: provider.name, providerRefId: event.providerRefId },
    select: {
      id: true,
      orderId: true,
      amount: true,
      status: true,
      order: { select: { status: true, notes: true } },
    },
  });
  if (!payment) {
    logger.warn({ provider: provider.name, providerRefId: event.providerRefId }, 'webhook referenced unknown payment');
    throw ApiError.notFound('Payment not found for the webhook reference');
  }

  if (payment.status === PaymentStatus.PAID) {
    return buildPaymentView(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id }, select: paymentSelect }));
  }

  const payload = parsePayload(rawBody);

  if (!event.success) {
    const failed = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED, webhookPayload: payload },
      select: paymentSelect,
    });
    return buildPaymentView(failed);
  }

  if (event.amount != null && !event.amount.eq(payment.amount)) {
    logger.warn(
      { paymentId: payment.id, expected: payment.amount.toFixed(2), received: event.amount.toFixed(2) },
      'webhook amount mismatch',
    );
    throw ApiError.conflict('Webhook amount does not match the payment');
  }

  try {
    await settlePaidPayment(payment, payload);
  } catch (err) {
    throw toApiError(err, { resource: 'Payment' });
  }

  return buildPaymentView(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id }, select: paymentSelect }));
}

function parsePayload(rawBody: Buffer): Prisma.InputJsonValue {
  try {
    const parsed = JSON.parse(rawBody.toString('utf8'));
    return (parsed && typeof parsed === 'object' ? parsed : {}) as Prisma.InputJsonValue;
  } catch {
    return {};
  }
}