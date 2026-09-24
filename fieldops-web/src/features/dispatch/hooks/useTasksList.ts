import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks.api';
import type { TaskQuery } from '../types';

export function useTasksList(query: TaskQuery) {
  return useQuery({
    queryKey: ['tasks', query],
    queryFn: () => tasksApi.list(query),
  });
}
