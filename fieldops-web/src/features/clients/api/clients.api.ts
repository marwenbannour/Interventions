import { apiFetch } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { Client, CreateClientInput, UpdateClientInput } from '../types';

export const clientsApi = {
  list: (search?: string) => {
    const params = new URLSearchParams({ limit: '100' });
    if (search) params.set('search', search);
    return apiFetch<Paginated<Client>>(`/clients?${params.toString()}`);
  },
  get: (id: string) => apiFetch<Client>(`/clients/${id}`),
  create: (input: CreateClientInput) => apiFetch<Client>('/clients', { method: 'POST', body: input }),
  update: (id: string, input: UpdateClientInput) =>
    apiFetch<Client>(`/clients/${id}`, { method: 'PATCH', body: input }),
};
