import { api } from '@/api/client';
import type { ApiEnvelope, Payment } from '@/api/types';

const CASHFREE_CHECKOUT_SRC = 'https://cdn.cashfree.com/js/cashfreejs/v1/cashfree.js';

let scriptPromise: Promise<boolean> | null = null;

/**
 * Loads Cashfree.js once, on demand. Returns false when the script cannot be
 * fetched (offline, blocked by an extension), so callers can fall back to
 * opening the payment link directly.
 */
export function loadCashfree(): Promise<boolean> {
  if ((window as unknown as { CashfreeCheckout?: unknown }).CashfreeCheckout) {
    return Promise.resolve(true);
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = CASHFREE_CHECKOUT_SRC;
    script.async = true;
    script.onload = () =>
      resolve(Boolean((window as unknown as { CashfreeCheckout?: unknown }).CashfreeCheckout));
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export interface CashfreeClientPayload {
  orderId: string;
  cfOrderId: string;
  paymentSessionId: string | null;
  paymentLink: string | null;
  amount: number;
  currency: string;
  returnUrl: string;
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
