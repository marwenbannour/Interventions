import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '../api/agents.api';
import type { AgentStatus } from '../types';

export function useAgents(params: { zoneId?: string; onDuty?: boolean; status?: AgentStatus } = {}) {
  return useQuery({
    queryKey: ['agents', params],
    queryFn: () => agentsApi.list(params),
  });
}

export function useLiveLocations() {
  return useQuery({
    queryKey: ['agents-live'],
    queryFn: agentsApi.liveLocations,
    refetchInterval: 30_000,
  });
}

export function useSetAgentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentProfileId, status }: { agentProfileId: string; status: AgentStatus }) =>
      agentsApi.setStatus(agentProfileId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useAgentLocationHistory(agentUserId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['agent-location-history', agentUserId, from, to],
    queryFn: () => agentsApi.locationHistory(agentUserId as string, from, to),
    enabled: !!agentUserId,
  });
}
