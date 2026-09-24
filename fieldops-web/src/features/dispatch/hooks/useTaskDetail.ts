import { useQuery } from '@tanstack/react-query';
import { photosApi } from '../api/photos.api';
import { tasksApi } from '../api/tasks.api';

export const taskQueryKey = (id: string) => ['task', id] as const;
export const taskHistoryQueryKey = (id: string) => ['task-history', id] as const;
export const taskPhotosQueryKey = (id: string) => ['task-photos', id] as const;

export function useTaskDetail(id: string | null) {
  return useQuery({
    queryKey: taskQueryKey(id ?? ''),
    queryFn: () => tasksApi.detail(id as string),
    enabled: !!id,
  });
}

export function useTaskHistory(id: string | null) {
  return useQuery({
    queryKey: taskHistoryQueryKey(id ?? ''),
    queryFn: () => tasksApi.history(id as string),
    enabled: !!id,
  });
}

export function useTaskPhotos(id: string | null) {
  return useQuery({
    queryKey: taskPhotosQueryKey(id ?? ''),
    queryFn: () => photosApi.list(id as string),
    enabled: !!id,
  });
}
