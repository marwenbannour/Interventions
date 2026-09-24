import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '../api/sites.api';
import type { CreateSiteInput, UpdateSiteInput } from '../types';

export function useSites(clientId: string | null) {
  return useQuery({
    queryKey: ['sites', clientId ?? ''],
    queryFn: () => sitesApi.list({ clientId: clientId as string }),
    enabled: !!clientId,
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSiteInput) => sitesApi.create(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sites', variables.clientId] });
    },
  });
}

export function useUpdateSite(id: string, clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSiteInput) => sitesApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', clientId] });
    },
  });
}
