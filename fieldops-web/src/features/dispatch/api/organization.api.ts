import { apiFetch } from '@/lib/api/client';
import type { Team, Zone } from '../types';

export const organizationApi = {
  zones: () => apiFetch<Zone[]>('/organization/zones'),
  teams: () => apiFetch<Team[]>('/organization/teams'),
};
