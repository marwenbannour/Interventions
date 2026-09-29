import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskQueryKey } from '@/features/dispatch/hooks/useTaskDetail';
import { evaluationsApi } from '../api/evaluations.api';
import type { CreateEvaluationInput, EvaluationQuery } from '../types';

export function useEvaluations(query: EvaluationQuery = {}) {
  return useQuery({
    queryKey: ['evaluations', query],
    queryFn: () => evaluationsApi.list(query),
  });
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEvaluationInput) => evaluationsApi.create(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: taskQueryKey(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
