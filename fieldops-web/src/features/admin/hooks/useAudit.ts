import { useQuery } from '@tanstack/react-query';
import { auditApi, usersApi } from '../api/audit.api';
import type { AuditQuery } from '../types';

export function useAuditLog(query: AuditQuery) {
  return useQuery({ queryKey: ['audit-logs', query], queryFn: () => auditApi.search(query) });
}

export function useAdminUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: usersApi.list, staleTime: 60_000 });
}
