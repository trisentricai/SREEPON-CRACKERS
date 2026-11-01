import { api } from '@/api/client';
import type { ApiEnvelope, Payment } from '@/api/types';

// Official Cashfree JS SDK (v3). Loaded from the CDN on demand so the storefront
// ships no extra bundle weight and the gateway can be swapped per environment.
const CASHFREE_SDK_SRC = 'https://sdk.cashfree.com/js/v3/cashfree.js';

export type CashfreeMode = 'sandbox' | 'production';

export interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget?: '_modal' | '_self' | '_blank';
}

export interface CashfreeCheckoutResult {
  error?: boolean;
  redirect?: boolean;
  paymentDetails?: { paymentMessage?: string };
}

export interface CashfreeInstance {
  checkout(options: CashfreeCheckoutOptions): Promise<CashfreeCheckoutResult> | void;
}

type CashfreeFactory = (options: { mode: CashfreeMode }) => CashfreeInstance;

type CashfreeWindow = Window & { Cashfree?: CashfreeFactory };

let scriptPromise: Promise<CashfreeFactory | null> | null = null;

/**
 * Loads the Cashfree JS SDK once, on demand. Resolves null when the script
 * cannot be fetched (offline, blocked by an extension) so callers can tell the
 * customer instead of hanging on a dead button.
 */
export function loadCashfree(): Promise<CashfreeFactory | null> {
  const existing = (window as CashfreeWindow).Cashfree;
  if (existing) return Promise.resolve(existing);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<CashfreeFactory | null>((resolve) => {
    const script = document.createElement('script');
    script.src = CASHFREE_SDK_SRC;
    script.async = true;
    script.onload = () => resolve((window as CashfreeWindow).Cashfree ?? null);
    script.onerror = () => {
      scriptPromise = null;
      resolve(null);
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

/** Returns a checkout instance bound to the environment the intent was created in. */
export async function getCashfree(mode: CashfreeMode): Promise<CashfreeInstance | null> {
  const factory = await loadCashfree();
  if (!factory) return null;
  try {
    return factory({ mode });
  } catch {
    return null;
  }
}

export interface CashfreeClientPayload {
  orderId: string;
  cfOrderId: string;
  paymentSessionId: string | null;
  paymentLink: string | null;
  amount: number;
  currency: string;
  returnUrl: string;
  mode: CashfreeMode;
}

/** Pulls the Cashfree hand-off details out of an intent's clientPayload. */
export function readCashfreePayload(
  payload: Record<string, unknown> | undefined,
): CashfreeClientPayload | null {
  const raw = payload?.cashfree;
  if (!raw || typeof raw !== 'object') return null;
  const {
    orderId,
    cfOrderId,
    paymentSessionId,
    paymentLink,
    amount,
    currency,
    returnUrl,
    mode,
  } = raw as Record<string, unknown>;
  if (typeof orderId !== 'string' || typeof cfOrderId !== 'string') return null;
  if (typeof amount !== 'number') return null;
  return {
    orderId,
    cfOrderId,
    paymentSessionId: typeof paymentSessionId === 'string' ? paymentSessionId : null,
    paymentLink: typeof paymentLink === 'string' ? paymentLink : null,
    amount,
    currency: typeof currency === 'string' ? currency : 'INR',
    returnUrl: typeof returnUrl === 'string' ? returnUrl : '',
    mode: mode === 'production' ? 'production' : 'sandbox',
  };
}

/**
 * The gateway webhook is the only thing allowed to mark a payment paid, and it
 * usually lands within a couple of seconds of checkout success. Poll briefly so
 * the customer sees a confirmed state instead of "pending".
 */
export async function waitForPaidPayment(paymentId: string, attempts = 10): Promise<Payment | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      const { data } = await api.get<ApiEnvelope<Payment>>(`/payments/${paymentId}`);
      if (data.data.status === 'PAID') return data.data;
      if (data.data.status === 'FAILED') return null;
    } catch {
      // Transient network error — keep polling until the attempt budget runs out.
    }
  }
  return null;
}
