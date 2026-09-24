import { apiFetch } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { AdminUser, AuditLogEntry, AuditQuery } from '../types';

export const auditApi = {
  search: (query: AuditQuery = {}) => {
    const search = new URLSearchParams({ limit: String(query.limit ?? 50) });
    if (query.resource) search.set('resource', query.resource);
    if (query.resourceId) search.set('resourceId', query.resourceId);
    if (query.userId) search.set('userId', query.userId);
    if (query.action) search.set('action', query.action);
    return apiFetch<Paginated<AuditLogEntry>>(`/audit-logs?${search.toString()}`);
  },
};

export const usersApi = {
  list: () => apiFetch<Paginated<AdminUser>>('/users?limit=200'),
};
