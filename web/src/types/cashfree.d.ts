/**
 * Minimal typings for Cashfree Checkout.js, loaded on demand from
 * cdn.cashfree.com. Only the fields this app uses are declared.
 */
export interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderNote: string;
  returnUrl: string;
  notificationUrl?: string;
  theme?: { color?: string };
  handler?: (response: Record<string, unknown>) => void;
  onError?: (error: Record<string, unknown>) => void;
}

export interface CashfreeCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    CashfreeCheckout?: new (options: CashfreeCheckoutOptions) => CashfreeCheckoutInstance;
  }
}
