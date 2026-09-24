import { apiFetch } from '../../../lib/api/client';
import type { DevicePlatform, NotificationListResponse, NotificationQuery } from '../../../lib/api/types';

function toQueryString(query: NotificationQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const notificationsApi = {
  list: (query: NotificationQuery = {}) =>
    apiFetch<NotificationListResponse>(`/notifications${toQueryString(query)}`),

  markRead: (ids: string[] | 'all') => apiFetch<void>('/notifications/read', { method: 'POST', body: { ids } }),

  registerDevice: (token: string, platform: DevicePlatform) =>
    apiFetch<void>('/notifications/devices', { method: 'POST', body: { token, platform } }),

  unregisterDevice: (token: string) =>
    apiFetch<void>(`/notifications/devices/${encodeURIComponent(token)}`, { method: 'DELETE' }),
};
