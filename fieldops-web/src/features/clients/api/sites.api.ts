import { apiFetch } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { CreateSiteInput, Site, UpdateSiteInput } from '../types';

export const sitesApi = {
  list: (params: { clientId?: string; search?: string } = {}) => {
    const search = new URLSearchParams({ limit: '100' });
    if (params.clientId) search.set('clientId', params.clientId);
    if (params.search) search.set('search', params.search);
    return apiFetch<Paginated<Site>>(`/sites?${search.toString()}`);
  },
  get: (id: string) => apiFetch<Site>(`/sites/${id}`),
  create: (input: CreateSiteInput) => apiFetch<Site>('/sites', { method: 'POST', body: input }),
  update: (id: string, input: UpdateSiteInput) => apiFetch<Site>(`/sites/${id}`, { method: 'PATCH', body: input }),
};
