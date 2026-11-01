import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { Prisma } from '@prisma/client';
import { env, isProduction } from '../../config/env';
import { ApiError } from '../../utils/http';
import { logger } from '../../utils/logger';

export type PaymentProviderName = 'cashfree' | 'stripe' | 'mock' | 'cash';

export interface CreateIntentCustomer {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface CreateIntentInput {
  amount: Prisma.Decimal;
  currency: string;
  /** Customer-facing order number, also the gateway's idempotent order_id. */
  orderNumber: string;
  /** Internal order id, used to build the return URL back into the app. */
  orderId: string;
  customer?: CreateIntentCustomer;
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

export interface IntentStatus {
  /** Provider-side state, upper-cased (e.g. PAID, ACTIVE, EXPIRED). */
  status: string;
  amount: Prisma.Decimal | null;
}

export interface PaymentProviderAdapter {
  readonly name: PaymentProviderName;
  isConfigured(): boolean;
  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  /** Rebuilds the client hand-off for an intent that already exists. */
  resumeIntent?(input: CreateIntentInput): Promise<Record<string, unknown> | null>;
  /** Server-to-server intent lookup, used to reconcile a missed webhook. */
  fetchIntentStatus?(refId: string): Promise<IntentStatus | null>;
  verifyWebhook(rawBody: Buffer, headers: IncomingHttpHeaders): Promise<WebhookEvent>;
}

function hmacHex(secret: string, body: Buffer): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

// Cashfree signs webhooks as base64(HMAC-SHA256(timestamp + rawBody, secret)).
function hmacBase64(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64');
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

/**
 * Cashfree rejects an order when `customer_details.customer_phone` is empty, so
 * a usable 10-digit Indian mobile number is mandatory for online payments.
 */
function normalisePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

function normaliseEmail(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

function cashfreeOrdersUrl(): string {
  return (env.CASHFREE_ENV ?? 'sandbox') === 'production'
    ? 'https://api.cashfree.com/pg/orders'
    : 'https://sandbox.cashfree.com/pg/orders';
}

function cashfreeHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-client-id': env.CASHFREE_APP_ID ?? '',
    'x-client-secret': env.CASHFREE_SECRET_KEY ?? '',
    'x-api-version': '2022-09-01',
  };
}

/**
 * Server-to-server confirmation of a Cashfree order. Used after a webhook so
 * an order is only ever marked paid on the gateway's own word.
 */
async function fetchOrderStatus(
  orderId: string,
): Promise<{ status: string; amount: Prisma.Decimal | null }> {
  const appId = env.CASHFREE_APP_ID;
  const secretKey = env.CASHFREE_SECRET_KEY;
  if (!appId || !secretKey) throw new Error('Cashfree credentials are not configured');
  const response = await fetch(`${cashfreeOrdersUrl()}/${encodeURIComponent(orderId)}`, {
    headers: {
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': '2022-09-01',
    },
  });
  if (!response.ok) throw new Error(`Cashfree order lookup failed with status ${response.status}`);
  const json = (await response.json().catch(() => ({}))) as {
    order_status?: string;
    order_amount?: number | string;
  };
  return {
    status: String(json.order_status ?? '').toUpperCase(),
    amount: json.order_amount != null ? new Prisma.Decimal(String(json.order_amount)) : null,
  };
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
  async createIntent({ amount, currency, orderNumber, orderId, customer }) {
    const appId = env.CASHFREE_APP_ID;
    const secretKey = env.CASHFREE_SECRET_KEY;
    if (!appId || !secretKey) {
      throw ApiError.serviceUnavailable('Cashfree is not configured on this server');
    }
    const phone = normalisePhone(customer?.phone);
    if (!phone) {
      throw ApiError.badRequest('A 10-digit mobile number is required for online payment');
    }
    const email = normaliseEmail(customer?.email);
    const name = customer?.name?.trim() || 'Customer';
    const baseUrl = cashfreeOrdersUrl();
    const returnUrl = `${env.PUBLIC_BASE_URL ?? 'https://sreepon.in'}/orders/${orderId}`;
    const mode = (env.CASHFREE_ENV ?? 'sandbox') === 'production' ? 'production' : 'sandbox';
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
          customer_name: name,
          customer_phone: phone,
          ...(email ? { customer_email: email } : {}),
        },
        order_meta: {
          return_url: returnUrl,
        },
      }),
    });
    const json = (await response.json().catch(() => ({}))) as {
      order_id?: string | number;
      cf_order_id?: string | number;
      payment_session_id?: string | number;
      payment_link?: string | null;
      code?: string;
      message?: string;
      error?: { message?: string; code?: string };
    };
    if (!response.ok || (json.order_id == null && json.cf_order_id == null)) {
      logger.warn(
        { status: response.status, code: json.code, message: json.message, error: json.error },
        'cashfree order creation failed',
      );
      throw ApiError.serviceUnavailable('Payment gateway rejected the request');
    }
    // Cashfree returns `cf_order_id` as a JSON number, but Prisma stores the
    // reference as a string — always coerce before persisting.
    const cashfreeOrderId = String(json.order_id);
    const cfOrderId = json.cf_order_id != null ? String(json.cf_order_id) : cashfreeOrderId;
    const paymentSessionId =
      json.payment_session_id != null ? String(json.payment_session_id) : null;
    return {
      // The webhook identifies the order by `order_id` (the reference we sent),
      // so that is what the lookup key must be.
      providerRefId: cashfreeOrderId,
      clientPayload: {
        cashfree: {
          orderId: cashfreeOrderId,
          cfOrderId,
          paymentSessionId,
          paymentLink: json.payment_link ?? null,
          amount: toPaise(amount),
          currency,
          returnUrl,
          mode,
        },
      },
    };
  },
  async resumeIntent({ amount, currency, orderNumber, orderId }) {
    // A pending payment may already exist (customer dismissed the modal). Cashfree
    // keeps the order_idempotent order, and GET returns a fresh session id.
    const response = await fetch(`${cashfreeOrdersUrl()}/${encodeURIComponent(orderNumber)}`, {
      headers: cashfreeHeaders(),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      logger.warn(
        { status: response.status, orderNumber, detail: detail.slice(0, 300) },
        'cashfree order resume failed',
      );
      return null;
    }
    const json = (await response.json().catch(() => ({}))) as {
      order_id?: string | number;
      cf_order_id?: string | number;
      payment_session_id?: string | number;
      order_status?: string;
    };
    const paymentSessionId =
      json.payment_session_id != null ? String(json.payment_session_id) : null;
    if (!paymentSessionId) return null;
    const mode = (env.CASHFREE_ENV ?? 'sandbox') === 'production' ? 'production' : 'sandbox';
    return {
      cashfree: {
        orderId: json.order_id != null ? String(json.order_id) : orderNumber,
        cfOrderId: json.cf_order_id != null ? String(json.cf_order_id) : orderNumber,
        paymentSessionId,
        paymentLink: null,
        amount: toPaise(amount),
        currency,
        returnUrl: `${env.PUBLIC_BASE_URL ?? 'https://sreepon.in'}/orders/${orderId}`,
        mode,
      },
    };
  },
  async fetchIntentStatus(refId) {
    try {
      return await fetchOrderStatus(refId);
    } catch (err) {
      logger.warn({ err, refId }, 'cashfree status lookup failed');
      return null;
    }
  },
  async verifyWebhook(rawBody, headers) {
    const secretKey = env.CASHFREE_SECRET_KEY;
    if (!secretKey) throw ApiError.serviceUnavailable('Cashfree webhook verification is not configured');
    const signature = headers['x-webhook-signature'] as string | undefined;
    const timestamp = headers['x-webhook-timestamp'] as string | undefined;
    if (!signature) throw ApiError.badRequest('Missing Cashfree webhook signature');
    if (!timestamp) throw ApiError.badRequest('Missing Cashfree webhook timestamp');

    // Signed payload is the timestamp concatenated with the *raw* body bytes;
    // re-serialising the parsed JSON would change the number formatting.
    const expected = hmacBase64(secretKey, `${timestamp}${rawBody.toString('utf8')}`);
    if (!safeEqual(expected, signature)) {
      throw ApiError.unauthorized('Invalid Cashfree webhook signature');
    }

    const body = parseJsonBody(rawBody);
    const eventType = String(body.type ?? '');
    // Cashfree nests everything under `data`; older payloads were flat.
    const data = (body.data && typeof body.data === 'object' ? body.data : body) as Record<string, unknown>;
    const order = (data.order ?? {}) as Record<string, unknown>;
    const payment = (data.payment ?? {}) as Record<string, unknown>;

    const orderId = order.order_id != null ? String(order.order_id) : null;
    const paymentStatus = String(payment.payment_status ?? '').toUpperCase();
    const orderStatus = String(order.order_status ?? '').toUpperCase();

    let success =
      eventType === 'PAYMENT_SUCCESS_WEBHOOK' || paymentStatus === 'SUCCESS' || orderStatus === 'PAID';

    // Confirm the money with the gateway itself rather than trusting the event
    // alone. A failed lookup keeps the webhook's verdict so a transient blip
    // does not silently leave a paid order unpaid.
    let confirmedAmount: Prisma.Decimal | null = null;
    if (success && orderId) {
      const confirmed = await fetchOrderStatus(orderId).catch(() => null);
      if (confirmed) {
        confirmedAmount = confirmed.amount;
        if (confirmed.status === 'PAID') {
          success = true;
        } else if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || paymentStatus === 'SUCCESS') {
          // The gateway says success but the order has not flipped to PAID yet
          // (late authorisation, replica lag). Answer non-2xx so Cashfree
          // retries instead of us recording a paid order as failed.
          throw ApiError.conflict('Payment is not confirmed as paid yet; retry the webhook');
        } else {
          success = false;
        }
      }
    }

    const amountValue = payment.payment_amount ?? order.order_amount ?? null;

    return {
      providerRefId: orderId,
      success,
      amount:
        amountValue != null
          ? new Prisma.Decimal(String(amountValue))
          : confirmedAmount,
      providerTransactionId:
        payment.cf_payment_id != null ? String(payment.cf_payment_id) : undefined,
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