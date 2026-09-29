import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '../api/integrations.api';

const WH = ['webhooks'] as const;
const KEYS = ['api-keys'] as const;

export const useCatalog = () => useQuery({ queryKey: ['integrations-catalog'], queryFn: integrationsApi.catalog, staleTime: Infinity });
export const useWebhooks = () => useQuery({ queryKey: WH, queryFn: integrationsApi.webhooks });
export const useApiKeys = () => useQuery({ queryKey: KEYS, queryFn: integrationsApi.apiKeys });

export function useDeliveries(webhookId: string | null) {
  return useQuery({
    queryKey: ['webhook-deliveries', webhookId],
    queryFn: () => integrationsApi.deliveries(webhookId as string),
    enabled: !!webhookId,
    refetchInterval: 5_000,
  });
}

/** Mutation générique qui rafraîchit les listes concernées. */
export function useIntegrationMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, keys: 'webhooks' | 'keys' = 'webhooks') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys === 'webhooks' ? WH : KEYS });
      qc.invalidateQueries({ queryKey: ['webhook-deliveries'] });
    },
  });
}
