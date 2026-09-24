import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { slaApi } from '../api/sla.api';
import type { CreateSlaPolicyInput, UpdateSlaPolicyInput } from '../types';

const POLICIES_KEY = ['sla-policies'] as const;

export function useSlaPolicies() {
  return useQuery({ queryKey: POLICIES_KEY, queryFn: slaApi.listPolicies });
}

export function useCreateSlaPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSlaPolicyInput) => slaApi.createPolicy(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}

export function useUpdateSlaPolicy(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSlaPolicyInput) => slaApi.updatePolicy(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}

export function useSlaAtRisk(horizonMinutes: number) {
  return useQuery({
    queryKey: ['sla-at-risk', horizonMinutes],
    queryFn: () => slaApi.atRisk(horizonMinutes),
    refetchInterval: 60_000,
  });
}
