import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma } from '@prisma/client';
import { env, isProduction } from '../../config/env';
import { ApiError } from '../../utils/http';
import { logger } from '../../utils/logger';

export type PaymentProviderName = 'cashfree' | 'stripe' | 'mock' | 'cash';

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
const MOCK_DEV_SECRET = 'sreepon-mock-pay-dev-secret';

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
    const signature = headers['x-sreepon-signature'] as string | undefined;
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

const cashfreeProvider: PaymentProviderAdapter = {
  name: 'cashfree',
  isConfigured() {
    return Boolean(env.CASHFREE_APP_ID && env.CASHFREE_SECRET_KEY);
  },
  async createIntent({ amount, currency, orderNumber }) {
    const appId = env.CASHFREE_APP_ID;
    const secretKey = env.CASHFREE_SECRET_KEY;
    const envMode = env.CASHFREE_ENV ?? 'sandbox';
    if (!appId || !secretKey) {
      throw ApiError.serviceUnavailable('Cashfree is not configured on this server');
    }
    const baseUrl = envMode === 'production'
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';
    const returnUrl = `${env.PUBLIC_BASE_URL ?? 'https://sreepon.in'}/orders/${orderNumber}`;
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2022-09-01',
      },
      body: JSON.stringify({
        order_id: orderNumber,
        order_amount: toPaise(amount) / 100,
        order_currency: currency,
        order_note: `Sreepon Order ${orderNumber}`,
        customer_details: {
          customer_id: orderNumber,
          customer_name: 'Customer',
          customer_phone: '',
          customer_email: '',
        },
        order_meta: {
          return_url: returnUrl,
          payment_methods: 'upi,card,netbanking,wallet',
        },
      }),
    });
    const json = (await response.json().catch(() => ({}))) as {
      order_id?: string;
      cf_order_id?: string;
      payment_session_id?: string;
      payment_link?: string;
      error?: { message?: string; code?: string };
    };
    if (!response.ok || (!json.order_id && !json.cf_order_id)) {
      logger.warn({ status: response.status, error: json.error }, 'cashfree order creation failed');
      throw ApiError.serviceUnavailable('Payment gateway rejected the request');
    }
    return {
      providerRefId: json.cf_order_id ?? json.order_id ?? null,
      clientPayload: {
        cashfree: {
          orderId: json.order_id ?? json.cf_order_id ?? '',
          cfOrderId: json.cf_order_id ?? json.order_id ?? '',
          paymentSessionId: json.payment_session_id ?? null,
          paymentLink: json.payment_link ?? null,
          amount: toPaise(amount),
          currency,
          returnUrl,
        },
      },
    };
  },
  async verifyWebhook(rawBody, headers) {
    const secretKey = env.CASHFREE_SECRET_KEY;
    if (!secretKey) throw ApiError.serviceUnavailable('Cashfree webhook verification is not configured');
    const signature = headers['x-webhook-signature'] as string | undefined;
    if (!signature) throw ApiError.badRequest('Missing Cashfree webhook signature');
    if (!safeEqual(hmacHex(secretKey, rawBody), signature)) {
      throw ApiError.unauthorized('Invalid Cashfree webhook signature');
    }
    const body = parseJsonBody(rawBody);
    const order = (body.order ?? {}) as Record<string, unknown>;
    const payment = (body.payment ?? {}) as Record<string, unknown>;
    const providerRefId = typeof order.id === 'string' ? order.id : typeof order.cf_order_id === 'string' ? order.cf_order_id : null;
    const amount = typeof payment.amount === 'number' ? new Prisma.Decimal(payment.amount).div(100) : null;
    return {
      providerRefId,
      success: String(order.status ?? payment.status ?? '').toUpperCase() === 'PAID',
      amount,
      providerTransactionId: typeof payment.payment_id === 'string' ? payment.payment_id : undefined,
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
  cashfree: cashfreeProvider,
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

const PROVIDER_LABELS: Record<PaymentProviderName, string> = {
  cashfree: 'UPI, cards & netbanking (Cashfree)',
  stripe: 'Card (Stripe)',
  mock: 'Test gateway',
  cash: 'Cash on delivery',
};

/**
 * The gateways a customer may actually choose: configured on this server, with
 * the mock gateway never advertised in production even if a secret is present.
 */
export function listAvailableProviders(): Array<{ name: PaymentProviderName; label: string }> {
  return (Object.values(REGISTRY) as PaymentProviderAdapter[])
    .filter((provider) => provider.isConfigured())
    .filter((provider) => provider.name !== 'mock' || !isProduction)
    .map((provider) => ({ name: provider.name, label: PROVIDER_LABELS[provider.name] }));
}