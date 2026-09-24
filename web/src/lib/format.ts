/** Formatting helpers shared across the customer storefront. */

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

/** Human label for a product unit enum value. */
export function formatUnit(unit: string | null | undefined): string {
  if (!unit) return '—';
  return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
}

/** Split a discount-from-MRP percentage, or null when there is no MRP. */
export function discountPercent(basePrice: string | number | null | undefined, mrpPrice: string | number | null | undefined): number | null {
  if (!basePrice || !mrpPrice) return null;
  const base = Number(basePrice);
  const mrp = Number(mrpPrice);
  if (!Number.isFinite(base) || !Number.isFinite(mrp) || mrp <= 0 || base >= mrp) return null;
  return Math.round(((mrp - base) / mrp) * 100);
}