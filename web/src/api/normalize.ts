/**
 * Coerce an API payload into a list.
 * The backend returns `/addresses` (and peers) as a bare array, but older
 * deployed builds still wrap lists in `{ items: [...] }`. Normalizing here
 * keeps the app working against either shape until every backend is upgraded.
 */
export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: T[] }).items;
  }
  return [];
}