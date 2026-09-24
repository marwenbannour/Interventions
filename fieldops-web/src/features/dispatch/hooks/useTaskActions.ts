import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photosApi } from '../api/photos.api';
import { tasksApi } from '../api/tasks.api';
import { taskHistoryQueryKey, taskPhotosQueryKey, taskQueryKey } from './useTaskDetail';

function useInvalidateTask(taskId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: taskQueryKey(taskId) });
    queryClient.invalidateQueries({ queryKey: taskHistoryQueryKey(taskId) });
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };
}

export function useAssignTask(taskId: string) {
  const invalidate = useInvalidateTask(taskId);
  return useMutation({
    mutationFn: (agentId: string) => tasksApi.assign(taskId, agentId),
    onSuccess: invalidate,
  });
}

export function useUnassignTask(taskId: string) {
  const invalidate = useInvalidateTask(taskId);
  return useMutation({
    mutationFn: () => tasksApi.unassign(taskId),
    onSuccess: invalidate,
  });
}

export function useTransitionTask(taskId: string) {
  const invalidate = useInvalidateTask(taskId);
  return useMutation({
    mutationFn: ({ to, comment }: { to: string; comment?: string }) => tasksApi.transition(taskId, to, comment),
    onSuccess: invalidate,
  });
}

export function useAddNote(taskId: string) {
  const invalidate = useInvalidateTask(taskId);
  return useMutation({
    mutationFn: (text: string) => tasksApi.addNote(taskId, text),
    onSuccess: invalidate,
  });
}

export function useValidatePhoto(taskId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTask(taskId);
  return useMutation({
    mutationFn: ({ photoId, valid, reason }: { photoId: string; valid: boolean; reason?: string }) =>
      photosApi.validate(photoId, valid, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskPhotosQueryKey(taskId) });
      invalidate();
    },
  });
}
