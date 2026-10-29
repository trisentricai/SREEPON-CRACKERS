import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { computeOrderTotals, type OrderPricingSettings } from '../src/modules/orders/pricing';

/**
 * Pure money maths — no database required. These lock the contract that order
 * totals are derived from store settings (GST rate, delivery fee, free-shipping
 * threshold) and never from client input.
 */

const NO_TAX: OrderPricingSettings['tax'] = { enabled: false, rate: 0, taxInclusive: false };
const NO_DELIVERY: OrderPricingSettings['delivery'] = {
  enabled: false,
  deliveryFee: '0.00',
  freeShippingAbove: null,
};

function settings(
  tax: Partial<OrderPricingSettings['tax']> = {},
  delivery: Partial<OrderPricingSettings['delivery']> = {},
): OrderPricingSettings {
  return {
    tax: { ...NO_TAX, ...tax },
    delivery: { ...NO_DELIVERY, ...delivery },
  };
}

const d = (value: string | number) => new Prisma.Decimal(String(value));

describe('computeOrderTotals', () => {
  it('leaves totals untouched when tax and delivery are off', () => {
    const totals = computeOrderTotals({ subtotal: d('1250.00'), discount: d(0), settings: settings() });
    expect(totals.tax.toFixed(2)).toBe('0.00');
    expect(totals.deliveryFee.toFixed(2)).toBe('0.00');
    expect(totals.grandTotal.toFixed(2)).toBe('1250.00');
  });

  it('adds exclusive GST on the post-discount value', () => {
    const totals = computeOrderTotals({
      subtotal: d('2500.00'),
      discount: d('500.00'),
      settings: settings({ enabled: true, rate: 18 }),
    });
    expect(totals.taxableBase.toFixed(2)).toBe('2000.00');
    expect(totals.tax.toFixed(2)).toBe('360.00');
    expect(totals.grandTotal.toFixed(2)).toBe('2360.00');
  });

  it('extracts inclusive GST without changing the grand total', () => {
    const totals = computeOrderTotals({
      subtotal: d('1180.00'),
      discount: d(0),
      settings: settings({ enabled: true, rate: 18, taxInclusive: true }),
    });
    expect(totals.tax.toFixed(2)).toBe('180.00');
    expect(totals.grandTotal.toFixed(2)).toBe('1180.00');
  });

  it('rounds fractional rates to paise', () => {
    const totals = computeOrderTotals({
      subtotal: d('420.19'),
      discount: d(0),
      settings: settings({ enabled: true, rate: 18 }),
    });
    expect(totals.tax.toFixed(2)).toBe('75.63');
    expect(totals.grandTotal.toFixed(2)).toBe('495.82');
  });

  it('charges delivery below the free-shipping threshold and waives it above', () => {
    const base = settings({}, { enabled: true, deliveryFee: '49.00', freeShippingAbove: '999.00' });

    const below = computeOrderTotals({ subtotal: d('500.00'), discount: d(0), settings: base });
    expect(below.deliveryFee.toFixed(2)).toBe('49.00');
    expect(below.grandTotal.toFixed(2)).toBe('549.00');

    const above = computeOrderTotals({ subtotal: d('1000.00'), discount: d(0), settings: base });
    expect(above.deliveryFee.toFixed(2)).toBe('0.00');
    expect(above.grandTotal.toFixed(2)).toBe('1000.00');
  });

  it('compares free shipping against the discounted value, not the raw subtotal', () => {
    const totals = computeOrderTotals({
      subtotal: d('1000.00'),
      discount: d('150.00'),
      settings: settings({}, { enabled: true, deliveryFee: '49.00', freeShippingAbove: '999.00' }),
    });
    expect(totals.deliveryFee.toFixed(2)).toBe('49.00');
    expect(totals.grandTotal.toFixed(2)).toBe('899.00');
  });

  it('does not charge shipping on a free-shipping threshold of zero', () => {
    const totals = computeOrderTotals({
      subtotal: d('100.00'),
      discount: d(0),
      settings: settings({}, { enabled: true, deliveryFee: '49.00', freeShippingAbove: '0.00' }),
    });
    expect(totals.deliveryFee.toFixed(2)).toBe('0.00');
  });

  it('never returns a negative total when a discount exceeds the subtotal', () => {
    const totals = computeOrderTotals({
      subtotal: d('500.00'),
      discount: d('800.00'),
      settings: settings({ enabled: true, rate: 18 }, { enabled: true, deliveryFee: '49.00' }),
    });
    expect(totals.taxableBase.toFixed(2)).toBe('0.00');
    expect(totals.tax.toFixed(2)).toBe('0.00');
    expect(totals.grandTotal.toFixed(2)).toBe('49.00');
  });
});
