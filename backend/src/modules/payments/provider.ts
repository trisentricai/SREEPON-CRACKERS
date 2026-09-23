import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma } from '@prisma/client';
import { env, isProduction } from '../../config/env';
import { ApiError } from '../../utils/http';
import { logger } from '../../utils/logger';

export type PaymentProviderName = 'razorpay' | 'stripe' | 'mock' | 'cash';

export interface CreateIntentInput {
  amount: Prisma.Decimal;
  currency: string;
  orderNumber: string;
}

export interface CreateIntentResult {
  providerRefId: string | null;
  clientPayload: Record<string, unknown>;
}

export interface WebhookEvent {
  providerRefId: string | null;
  success: boolean;
  amount: Prisma.Decimal | null;
  providerTransactionId?: string;
}

export interface PaymentProviderAdapter {
  readonly name: PaymentProviderName;
  isConfigured(): boolean;
  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  verifyWebhook(rawBody: Buffer, headers: IncomingHttpHeaders): Promise<WebhookEvent>;
}

function hmacHex(secret: string, body: Buffer): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function basicAuth(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

function toPaise(amount: Prisma.Decimal): number {
  return Math.round(amount.mul(100).toNumber());
}

// Secret for the local/mock provider. Only meaningful outside production;
// production requires the env var to be set explicitly.
const MOCK_DEV_SECRET = 'sripon-mock-pay-dev-secret';

function mockWebhookSecret(): string | undefined {
  return env.PAYMENT_MOCK_WEBHOOK_SECRET ?? (!isProduction ? MOCK_DEV_SECRET : undefined);
}

function parseJsonBody(rawBody: Buffer): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawBody.toString('utf8'));
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw ApiError.badRequest('Webhook body must be valid JSON');
}

const mockProvider: PaymentProviderAdapter = {
  name: 'mock',
  isConfigured() {
    return Boolean(mockWebhookSecret());
  },
  async createIntent({ amount, currency, orderNumber }) {
    return {
      providerRefId: `mock_${randomUUID()}`,
      clientPayload: {
        provider: 'mock',
        mode: 'test',
        amount: amount.toFixed(2),
        currency,
        orderNumber,
      },
    };
  },
  async verifyWebhook(rawBody, headers) {
    const secret = mockWebhookSecret();
    if (!secret) throw ApiError.serviceUnavailable('Mock payment provider is not configured');
    const signature = headers['x-sripon-signature'] as string | undefined;
    if (!signature) throw ApiError.badRequest('Missing webhook signature');
    if (!safeEqual(hmacHex(secret, rawBody), signature)) {
      throw ApiError.unauthorized('Invalid webhook signature');
    }
    const body = parseJsonBody(rawBody);
    const providerRefId = body.providerRefId;
    if (!providerRefId) throw ApiError.badRequest('Missing providerRefId in webhook body');
    const amount = body.amount != null ? new Prisma.Decimal(String(body.amount)) : null;
    return {
      providerRefId: String(providerRefId),
      success: body.success !== false,
      amount,
      providerTransactionId: body.providerTransactionId != null ? String(body.providerTransactionId) : undefined,
    };
  },
};

const razorpayProvider: PaymentProviderAdapter = {
  name: 'razorpay',
  isConfigured() {
    return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  },
  async createIntent({ amount, currency, orderNumber }) {
    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw ApiError.serviceUnavailable('Razorpay is not configured on this server');
    }
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuth(keyId, keySecret),
      },
      body: JSON.stringify({ amount: toPaise(amount), currency, receipt: orderNumber, payment_capture: 1 }),
    });
    const json = (await response.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
    if (!response.ok || !json.id) {
      logger.warn({ status: response.status, error: json.error }, 'razorpay order creation failed');
      throw ApiError.serviceUnavailable('Payment gateway rejected the request');
    }
    return {
      providerRefId: json.id,
      clientPayload: { razorpay: { keyId, amount: toPaise(amount), currency, orderId: json.id } },
    };
  },
  async verifyWebhook(rawBody, headers) {
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw ApiError.serviceUnavailable('Razorpay webhook verification is not configured');
    const signature = headers['x-razorpay-signature'] as string | undefined;
    if (!signature) throw ApiError.badRequest('Missing Razorpay signature');
    if (!safeEqual(hmacHex(keySecret, rawBody), signature)) {
      throw ApiError.unauthorized('Invalid webhook signature');
    }
    const body = parseJsonBody(rawBody);
    const event = String(body.event ?? '');
    const payload = (body.payload ?? {}) as Record<string, unknown>;
    const paymentEntity = (payload.payment ?? {}) as Record<string, unknown>;
    const entity = (paymentEntity.entity ?? {}) as Record<string, unknown>;
    const providerRefId = typeof entity.order_id === 'string' ? entity.order_id : null;
    const amount = typeof entity.amount === 'number' ? new Prisma.Decimal(entity.amount).div(100) : null;
    return {
      providerRefId,
      success: event === 'payment.captured' || event === 'order.paid',
      amount,
      providerTransactionId: typeof entity.id === 'string' ? entity.id : undefined,
    };
  },
};

const stripeProvider: PaymentProviderAdapter = {
  name: 'stripe',
  isConfigured() {
    return Boolean(env.STRIPE_SECRET_KEY);
  },
  async createIntent({ amount, currency, orderNumber }) {
    const secretKey = env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw ApiError.serviceUnavailable('Stripe is not configured on this server');
    }
    const body = new URLSearchParams({
      amount: String(toPaise(amount)),
      currency,
      'metadata[order_number]': orderNumber,
      // force a 3DS-style authentication flow request so mobile clients can confirm.
      payment_method_types: 'card',
    });
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: { Authorization: basicAuth(secretKey, ''), 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await response.json().catch(() => ({}))) as { id?: string; client_secret?: string };
    if (!response.ok || !json.id) {
      logger.warn({ status: response.status }, 'stripe payment intent creation failed');
      throw ApiError.serviceUnavailable('Payment gateway rejected the request');
    }
    return {
      providerRefId: json.id,
      clientPayload: { stripe: { intentId: json.id, clientSecret: json.client_secret } },
    };
  },
  async verifyWebhook(rawBody, headers) {
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw ApiError.serviceUnavailable('Stripe webhook verification is not configured');
    const signature = headers['stripe-signature'] as string | undefined;
    if (!signature) throw ApiError.badRequest('Missing Stripe signature');
    const parts: Record<string, string | undefined> = {};
    for (const chunk of signature.split(',')) {
      const [key, value] = chunk.split('=');
      if (key && value) parts[key.trim()] = value.trim();
    }
    const timestamp = parts.t;
    const signatureV1 = parts.v1;
    if (!timestamp || !signatureV1) throw ApiError.unauthorized('Malformed Stripe signature');
    const signedPayload = Buffer.from(`${timestamp}.${rawBody.toString('utf8')}`);
    const expected = hmacHex(webhookSecret, signedPayload);
    if (!safeEqual(expected, signatureV1)) throw ApiError.unauthorized('Invalid Stripe signature');
    const body = parseJsonBody(rawBody);
    const eventType = String(body.type ?? '');
    const data = (body.data ?? {}) as Record<string, unknown>;
    const entity = (data.object ?? {}) as Record<string, unknown>;
    return {
      providerRefId: typeof entity.payment_intent === 'string' ? entity.payment_intent : typeof entity.id === 'string' && eventType.endsWith('payment_intent.succeeded') ? (entity.id as string) : null,
      success: eventType.endsWith('payment_intent.succeeded') || eventType === 'charge.succeeded',
      amount: typeof entity.amount === 'number' ? new Prisma.Decimal(entity.amount).div(100) : null,
      providerTransactionId: typeof entity.id === 'string' ? entity.id : undefined,
    };
  },
};

const cashProvider: PaymentProviderAdapter = {
  name: 'cash',
  isConfigured() {
    return true;
  },
  async createIntent() {
    return {
      providerRefId: null,
      clientPayload: { provider: 'cash', mode: 'cash_on_delivery' },
    };
  },
  async verifyWebhook() {
    throw ApiError.badRequest('The cash provider does not emit webhooks');
  },
};

const REGISTRY: Record<PaymentProviderName, PaymentProviderAdapter> = {
  razorpay: razorpayProvider,
  stripe: stripeProvider,
  mock: mockProvider,
  cash: cashProvider,
};

export function getProvider(name: string): PaymentProviderAdapter {
  const provider = REGISTRY[name as PaymentProviderName];
  if (!provider) throw ApiError.badRequest(`Unsupported payment provider: ${name}`);
  return provider;
}

export function assertProviderConfigured(provider: PaymentProviderAdapter): void {
  if (!provider.isConfigured()) {
    throw ApiError.serviceUnavailable(`The ${provider.name} payment provider is not configured on this server`);
  }
}