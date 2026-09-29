import { apiFetch } from '../../../lib/api/client';
import type { CreateEvaluationInput, Evaluation, EvaluationQuery, Paginated } from '../../../lib/api/types';

function toQueryString(query: EvaluationQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const evaluationsApi = {
  list: (query: EvaluationQuery = {}) => apiFetch<Paginated<Evaluation>>(`/evaluations${toQueryString(query)}`),
  create: (input: CreateEvaluationInput) => apiFetch<Evaluation>('/evaluations', { method: 'POST', body: input }),
};
