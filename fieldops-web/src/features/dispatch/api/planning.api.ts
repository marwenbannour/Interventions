import { apiFetch } from '@/lib/api/client';
import type { PlanningBoard, SuggestedAgentsResponse } from '../types';

export const planningApi = {
  board: (params: { from: string; to: string; zoneId?: string; teamId?: string }) => {
    const search = new URLSearchParams();
    search.set('from', params.from);
    search.set('to', params.to);
    if (params.zoneId) search.set('zoneId', params.zoneId);
    if (params.teamId) search.set('teamId', params.teamId);
    return apiFetch<PlanningBoard>(`/planning?${search.toString()}`);
  },
  suggestedAgents: (taskId: string, limit = 5) =>
    apiFetch<SuggestedAgentsResponse>(`/tasks/${taskId}/suggested-agents?limit=${limit}`),
};
