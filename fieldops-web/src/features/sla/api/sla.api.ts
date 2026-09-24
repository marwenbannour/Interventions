import { apiFetch } from '@/lib/api/client';
import type { CreateSlaPolicyInput, SlaAtRiskTask, SlaPolicy, UpdateSlaPolicyInput } from '../types';

export const slaApi = {
  listPolicies: () => apiFetch<SlaPolicy[]>('/sla/policies'),
  createPolicy: (input: CreateSlaPolicyInput) => apiFetch<SlaPolicy>('/sla/policies', { method: 'POST', body: input }),
  updatePolicy: (id: string, input: UpdateSlaPolicyInput) =>
    apiFetch<SlaPolicy>(`/sla/policies/${id}`, { method: 'PATCH', body: input }),
  atRisk: (horizonMinutes = 60) => apiFetch<SlaAtRiskTask[]>(`/sla/at-risk?horizonMinutes=${horizonMinutes}`),
};
