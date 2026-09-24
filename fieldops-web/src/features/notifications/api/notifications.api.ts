import { apiFetch } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { NotificationListResponse, NotificationQuery, SendNotificationInput, SimpleUser } from '../types';

export const notificationsApi = {
  list: (query: NotificationQuery = {}) => {
    const search = new URLSearchParams({ limit: String(query.limit ?? 30) });
    if (query.unreadOnly) search.set('unreadOnly', 'true');
    return apiFetch<NotificationListResponse>(`/notifications?${search.toString()}`);
  },
  markRead: (ids: string[] | 'all') => apiFetch<void>('/notifications/read', { method: 'POST', body: { ids } }),
  send: (input: SendNotificationInput) => apiFetch<unknown>('/notifications/send', { method: 'POST', body: input }),
  users: () => apiFetch<Paginated<SimpleUser>>('/users?limit=200'),
};
