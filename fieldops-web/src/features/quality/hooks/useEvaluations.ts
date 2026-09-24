import { useQuery } from '@tanstack/react-query';
import { evaluationsApi } from '../api/evaluations.api';
import type { EvaluationQuery } from '../types';

export function useEvaluations(query: EvaluationQuery = {}) {
  return useQuery({
    queryKey: ['evaluations', query],
    queryFn: () => evaluationsApi.list(query),
  });
}
