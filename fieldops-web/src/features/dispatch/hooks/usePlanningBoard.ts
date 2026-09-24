import { useQuery } from '@tanstack/react-query';
import { planningApi } from '../api/planning.api';

export interface PlanningFilters {
  from: string;
  to: string;
  zoneId?: string;
  teamId?: string;
}

export const planningQueryKey = (filters: PlanningFilters) => ['planning', filters] as const;

export function usePlanningBoard(filters: PlanningFilters) {
  return useQuery({
    queryKey: planningQueryKey(filters),
    queryFn: () => planningApi.board(filters),
  });
}
