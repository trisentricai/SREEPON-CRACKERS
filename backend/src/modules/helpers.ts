import { notImplemented } from '../utils/http';

/**
 * Phase 1 disclosure for a not-yet-implemented module endpoint.
 * Returns a proper 501 JSON envelope that Phases 3–8 replace with real
 * controllers, schemas, and services.
 */
export function pending(name: string) {
  return notImplemented(name);
}