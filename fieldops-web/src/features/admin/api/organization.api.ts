import { apiFetch } from '@/lib/api/client';
import type {
  CreateTeamInput,
  CreateZoneInput,
  Organization,
  Team,
  UpdateTeamInput,
  UpdateZoneInput,
  Zone,
} from '../types';

export const organizationAdminApi = {
  get: () => apiFetch<Organization>('/organization'),
  update: (input: { name?: string; settings?: Organization['settings'] }) =>
    apiFetch<Organization>('/organization', { method: 'PATCH', body: input }),

  zones: () => apiFetch<Zone[]>('/organization/zones'),
  createZone: (input: CreateZoneInput) => apiFetch<Zone>('/organization/zones', { method: 'POST', body: input }),
  updateZone: (id: string, input: UpdateZoneInput) =>
    apiFetch<Zone>(`/organization/zones/${id}`, { method: 'PATCH', body: input }),
  deleteZone: (id: string) => apiFetch<void>(`/organization/zones/${id}`, { method: 'DELETE' }),

  teams: () => apiFetch<Team[]>('/organization/teams'),
  createTeam: (input: CreateTeamInput) => apiFetch<Team>('/organization/teams', { method: 'POST', body: input }),
  updateTeam: (id: string, input: UpdateTeamInput) =>
    apiFetch<Team>(`/organization/teams/${id}`, { method: 'PATCH', body: input }),
  deleteTeam: (id: string) => apiFetch<void>(`/organization/teams/${id}`, { method: 'DELETE' }),
};
