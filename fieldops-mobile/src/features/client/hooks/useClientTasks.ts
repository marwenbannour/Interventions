import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../tasks/api/tasks.api';
import { photosApi } from '../../photos/api/photos.api';
import { evaluationsApi } from '../api/evaluations.api';
import type { CreateEvaluationInput, TaskQuery } from '../../../lib/api/types';

export const clientTasksQueryKey = (query: TaskQuery) => ['client-tasks', query] as const;
export const clientTaskDetailQueryKey = (id: string) => ['client-task', id] as const;
export const clientTaskPhotosQueryKey = (id: string) => ['client-task-photos', id] as const;
export const clientEvaluationsQueryKey = (taskId: string) => ['client-evaluations', taskId] as const;

export function useClientTasks(query: TaskQuery = {}) {
  return useQuery({
    queryKey: clientTasksQueryKey(query),
    queryFn: () => tasksApi.list(query),
  });
}

export function useClientTaskDetail(id: string | null) {
  return useQuery({
    queryKey: clientTaskDetailQueryKey(id ?? ''),
    queryFn: () => tasksApi.detail(id as string),
    enabled: !!id,
  });
}

export function useClientTaskPhotos(id: string | null) {
  return useQuery({
    queryKey: clientTaskPhotosQueryKey(id ?? ''),
    queryFn: () => photosApi.list(id as string),
    enabled: !!id,
  });
}

export function useClientEvaluation(taskId: string | null) {
  return useQuery({
    queryKey: clientEvaluationsQueryKey(taskId ?? ''),
    queryFn: () => evaluationsApi.list({ taskId: taskId as string }),
    enabled: !!taskId,
  });
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEvaluationInput) => evaluationsApi.create(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: clientEvaluationsQueryKey(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: clientTaskDetailQueryKey(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: ['client-tasks'] });
    },
  });
}
