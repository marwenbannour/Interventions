import { apiFetch } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { AdminUser, CreateUserInput, Role, UpdateUserInput, UserStatus } from '../types';

export const usersAdminApi = {
  list: (params: { role?: Role; status?: UserStatus; search?: string } = {}) => {
    const search = new URLSearchParams({ limit: '200' });
    if (params.role) search.set('role', params.role);
    if (params.status) search.set('status', params.status);
    if (params.search) search.set('search', params.search);
    return apiFetch<Paginated<AdminUser>>(`/users?${search.toString()}`);
  },
  create: (input: CreateUserInput) => apiFetch<AdminUser>('/users', { method: 'POST', body: input }),
  update: (id: string, input: UpdateUserInput) => apiFetch<AdminUser>(`/users/${id}`, { method: 'PATCH', body: input }),
};
