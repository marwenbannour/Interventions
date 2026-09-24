import { apiFetch } from '../../../lib/api/client';
import type { AgentProfile } from '../../../lib/api/types';

export const agentsApi = {
  me: () => apiFetch<AgentProfile>('/agents/me'),
  setDuty: (onDuty: boolean) => apiFetch<AgentProfile>('/agents/me/duty', { method: 'POST', body: { onDuty } }),
};
