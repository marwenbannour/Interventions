import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../api/clients.api';
import type { CreateClientInput, UpdateClientInput } from '../types';

export function useClients(search?: string) {
  return useQuery({
    queryKey: ['clients', search ?? ''],
    queryFn: () => clientsApi.list(search),
  });
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: ['client', id ?? ''],
    queryFn: () => clientsApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => clientsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClientInput) => clientsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', id] });
    },
  });
}
