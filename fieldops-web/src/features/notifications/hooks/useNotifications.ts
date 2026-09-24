import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import type { NotificationQuery, SendNotificationInput } from '../types';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

export function useNotifications(query: NotificationQuery = {}) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, query],
    queryFn: () => notificationsApi.list(query),
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | 'all') => notificationsApi.markRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendNotificationInput) => notificationsApi.send(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}

export function useNotificationUsers() {
  return useQuery({ queryKey: ['notification-users'], queryFn: notificationsApi.users, staleTime: 60_000 });
}
