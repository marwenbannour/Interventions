import { apiFetch } from '@/lib/api/client';
import type { WorkflowDefinition } from '../types';

export const workflowsApi = {
  list: () => apiFetch<WorkflowDefinition[]>('/workflows'),
};
