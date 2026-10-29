import { api } from '@/api/client';
import type { ApiEnvelope, Payment } from '@/api/types';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise: Promise<boolean> | null = null;

/**
 * Loads Razorpay Checkout.js once, on demand. Returns false when the script
 * cannot be fetched (offline, blocked by an extension), so callers can fall
 * back to leaving the order unpaid rather than throwing.
 */
export function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export interface RazorpayClientPayload {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
}

/** Pulls the Razorpay hand-off details out of an intent's clientPayload. */
export function readRazorpayPayload(payload: Record<string, unknown> | undefined): RazorpayClientPayload | null {
  const raw = payload?.razorpay;
  if (!raw || typeof raw !== 'object') return null;
  const { keyId, amount, currency, orderId } = raw as Record<string, unknown>;
  if (typeof keyId !== 'string' || typeof orderId !== 'string') return null;
  if (typeof amount !== 'number') return null;
  return { keyId, amount, currency: typeof currency === 'string' ? currency : 'INR', orderId };
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
