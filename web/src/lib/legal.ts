import { LEGAL_POLICY_KEYS, type LegalPolicyKey } from '@/api/types';

/**
 * Fallback labels for policy pages before an admin has given them a title.
 * Shared by the footer and the policy pages so both read the same names.
 */
export const LEGAL_LABELS: Record<LegalPolicyKey, string> = {
  privacy: 'Privacy policy',
  terms: 'Terms of service',
  shipping: 'Shipping policy',
  returns: 'Returns policy',
  refund: 'Refund policy',
  cancellation: 'Cancellation policy',
};

/** Policy slugs in reading order, each paired with its fallback label. */
export const LEGAL_LINKS = LEGAL_POLICY_KEYS.map((key) => ({
  key,
  label: LEGAL_LABELS[key],
  to: `/policies/${key}`,
}));
