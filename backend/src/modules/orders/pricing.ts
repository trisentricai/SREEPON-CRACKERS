import { Prisma } from '@prisma/client';

/** The slice of store settings that affects an order's money. */
export interface OrderPricingSettings {
  tax: {
    enabled: boolean;
    rate: number;
    taxInclusive: boolean;
  };
  delivery: {
    enabled: boolean;
    deliveryFee: string | number;
    freeShippingAbove: string | number | null;
  };
}

export interface OrderTotals {
  /** Merchandise value after discount — the base tax and free-shipping compare against. */
  taxableBase: Prisma.Decimal;
  tax: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
}

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

function money(value: Prisma.Decimal): Prisma.Decimal {
  // decimal.js rounds half-up by default; avoid the `Prisma.Decimal.ROUND_*`
  // statics, which are stripped from the Cloudflare Worker build.
  return value.toDecimalPlaces(2);
}

/** `max(0, value)` without the Decimal statics (absent in the Worker runtime). */
function atLeastZero(value: Prisma.Decimal): Prisma.Decimal {
  return value.gt(ZERO) ? value : ZERO;
}

function toDecimal(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(String(value));
}

/**
 * Authoritative order maths. Prices, discounts and rates never come from the
 * client; this runs inside the order transaction with settings read server-side.
 *
 * - Tax is charged on the post-discount merchandise value (never on shipping).
 * - When `taxInclusive` is on, catalog prices already contain GST: the grand
 *   total is unchanged and `tax` is the portion extracted for the invoice.
 * - Free shipping compares against the same post-discount value, so a coupon
 *   can push an order below the threshold.
 */
export function computeOrderTotals(input: {
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  settings: OrderPricingSettings;
}): OrderTotals {
  const subtotal = money(input.subtotal);
  const discount = money(input.discount);
  const taxableBase = money(atLeastZero(subtotal.sub(discount)));

  const rate = input.settings.tax.enabled ? toDecimal(input.settings.tax.rate) : ZERO;
  let tax = ZERO;
  if (rate.gt(0) && taxableBase.gt(0)) {
    tax = input.settings.tax.taxInclusive
      ? taxableBase.mul(rate).div(HUNDRED.add(rate))
      : taxableBase.mul(rate).div(HUNDRED);
    tax = money(tax);
  }

  let deliveryFee = ZERO;
  if (input.settings.delivery.enabled) {
    const freeAbove = input.settings.delivery.freeShippingAbove;
    const qualifiesForFreeShipping = freeAbove !== null && taxableBase.gte(toDecimal(freeAbove));
    if (!qualifiesForFreeShipping) {
      deliveryFee = money(atLeastZero(toDecimal(input.settings.delivery.deliveryFee)));
    }
  }

  const taxAddedToTotal = input.settings.tax.taxInclusive ? ZERO : tax;
  const grandTotal = money(atLeastZero(taxableBase.add(taxAddedToTotal).add(deliveryFee)));

  return { taxableBase, tax, deliveryFee, grandTotal };
}
