import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ApiEnvelope, LegalSettings, PublicSettings } from '@/api/types';

/**
 * Public store settings (`/settings/public`): store name, support contacts,
 * delivery/tax rules and social links. Shared across the shell, footer and
 * home page so one fetch serves all of them.
 */
export function usePublicSettings() {
  return useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<PublicSettings>>('/settings/public');
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

/** Published legal policy pages (`/settings/legal`). */
export function usePublicLegal() {
  return useQuery({
    queryKey: ['public-legal'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<LegalSettings>>('/settings/legal');
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}
