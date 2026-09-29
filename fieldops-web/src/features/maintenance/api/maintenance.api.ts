import { apiFetch } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { GenerationResult, MaintenancePlan, MaintenancePlanInput, UpdateMaintenancePlanInput } from '../types';

export const maintenanceApi = {
  list: () => apiFetch<Paginated<MaintenancePlan>>('/maintenance-plans?limit=200'),
  create: (input: MaintenancePlanInput) => apiFetch<MaintenancePlan>('/maintenance-plans', { method: 'POST', body: input }),
  update: (id: string, input: UpdateMaintenancePlanInput) =>
    apiFetch<MaintenancePlan>(`/maintenance-plans/${id}`, { method: 'PATCH', body: input }),
  preview: (id: string, count = 6) =>
    apiFetch<{ planId: string; occurrences: string[] }>(`/maintenance-plans/${id}/preview?count=${count}`),
  generate: (id: string) => apiFetch<GenerationResult>(`/maintenance-plans/${id}/generate`, { method: 'POST' }),
};
