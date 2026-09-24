import { apiFetch } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { Evaluation, EvaluationQuery } from '../types';

export const evaluationsApi = {
  list: (query: EvaluationQuery = {}) => {
    const search = new URLSearchParams({ limit: String(query.limit ?? 50) });
    if (query.agentId) search.set('agentId', query.agentId);
    if (query.clientId) search.set('clientId', query.clientId);
    if (query.taskId) search.set('taskId', query.taskId);
    return apiFetch<Paginated<Evaluation>>(`/evaluations?${search.toString()}`);
  },
};
