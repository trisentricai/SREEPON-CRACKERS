import { describe, expect, it } from 'vitest';
import { MAX_BATCH_SIZE, cutoffFor, staleOrderFilter } from '../src/modules/maintenance/service';

/**
 * Pure contract for the scheduled order-expiry job — no database required.
 *
 * Two rules must never regress:
 *  - only unpaid orders that have been pending past the window are cancelled;
 *  - cash-on-delivery orders are never auto-cancelled (they are not paid
 *    online at all, so their payment status stays PENDING until delivery).
 */
describe('cutoffFor', () => {
  it('subtracts the window in minutes from the reference instant', () => {
    const now = new Date('2026-10-30T12:00:00.000Z');
    expect(cutoffFor(60, now).toISOString()).toBe('2026-10-30T11:00:00.000Z');
    expect(cutoffFor(24 * 60, now).toISOString()).toBe('2026-10-29T12:00:00.000Z');
  });

  it('defaults the reference instant to now', () => {
    const before = Date.now();
    const cutoff = cutoffFor(90).getTime();
    const after = Date.now();
    expect(cutoff).toBeGreaterThanOrEqual(before - 90 * 60_000);
    expect(cutoff).toBeLessThanOrEqual(after - 90 * 60_000);
  });
});

describe('staleOrderFilter', () => {
  const cutoff = new Date('2026-10-30T00:00:00.000Z');
  const where = staleOrderFilter(cutoff);

  it('only targets orders that are still PENDING', () => {
    expect(where.status).toBe('PENDING');
  });

  it('only targets unpaid orders', () => {
    expect(where.paymentStatus).toEqual({ in: ['PENDING', 'FAILED'] });
  });

  it('only targets orders created before the cutoff', () => {
    expect(where.createdAt).toEqual({ lt: cutoff });
  });

  it('never targets cash-on-delivery orders', () => {
    expect(where.payments).toEqual({ none: { provider: 'cash' } });
  });

  it('caps a single run so a backlog drains over several invocations', () => {
    expect(MAX_BATCH_SIZE).toBeGreaterThan(0);
    expect(MAX_BATCH_SIZE).toBeLessThanOrEqual(200);
  });
});
