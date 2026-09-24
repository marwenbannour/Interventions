import { apiFetch } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { AgentListItem, AgentStatus, LivePosition, LocationHistory } from '../types';

export const agentsApi = {
  list: (params: { zoneId?: string; onDuty?: boolean; status?: AgentStatus; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.zoneId) search.set('zoneId', params.zoneId);
    if (params.onDuty !== undefined) search.set('onDuty', String(params.onDuty));
    if (params.status) search.set('status', params.status);
    search.set('limit', String(params.limit ?? 100));
    return apiFetch<Paginated<AgentListItem>>(`/agents?${search.toString()}`);
  },
  liveLocations: () => apiFetch<LivePosition[]>('/agents/locations/live'),
  setStatus: (agentProfileId: string, status: AgentStatus) =>
    apiFetch<AgentListItem>(`/agents/${agentProfileId}/status`, { method: 'POST', body: { status } }),
  locationHistory: (agentUserId: string, from: string, to: string) =>
    apiFetch<LocationHistory>(
      `/agents/${agentUserId}/location/history?${new URLSearchParams({ from, to }).toString()}`,
    ),
};
