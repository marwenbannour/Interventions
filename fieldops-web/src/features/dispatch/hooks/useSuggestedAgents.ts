import { useQuery } from '@tanstack/react-query';
import { planningApi } from '../api/planning.api';

export function useSuggestedAgents(taskId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['suggested-agents', taskId],
    queryFn: () => planningApi.suggestedAgents(taskId as string),
    enabled: !!taskId && enabled,
  });
}
