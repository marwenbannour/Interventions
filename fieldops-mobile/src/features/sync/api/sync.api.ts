import { apiFetch } from '../../../lib/api/client';
import type { SyncPullResponse, SyncPushRequest, SyncPushResponse } from '../../../lib/api/types';

export const syncApi = {
  push: (body: SyncPushRequest) => apiFetch<SyncPushResponse>('/sync/push', { method: 'POST', body }),

  pull: (since?: string) =>
    apiFetch<SyncPullResponse>(`/sync/pull${since ? `?since=${encodeURIComponent(since)}` : ''}`),
};
