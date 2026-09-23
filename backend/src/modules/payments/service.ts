import type { IncomingHttpHeaders } from 'node:http';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { PaymentStatus } from '../../types/enums';
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
export async function createPayment(userId: string, input: CreatePaymentInput) {
  const provider = getProvider(input.provider);
  assertProviderConfigured(provider);

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId },
    select: { id: true, orderNumber: true, grandTotal: true, paymentStatus: true },
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
  if (existing) {
    return buildPaymentView(existing);
  }

  const intent = await provider.createIntent({
    amount: order.grandTotal,
    currency: 'INR',
    orderNumber: order.orderNumber,
  });

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
    select: paymentSelect,
  });
  if (!payment) throw ApiError.notFound('Payment not found');
  return buildPaymentView(payment);
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
    select: { id: true, orderId: true, amount: true, status: true },
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