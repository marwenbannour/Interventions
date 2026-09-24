import { apiFetch } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import type { TaskDetail, TaskEvent, TaskListItem, TaskQuery } from '../types';

function toQueryString(query: TaskQuery): string {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  return search.toString();
}

export const tasksApi = {
  list: (query: TaskQuery = {}) => apiFetch<Paginated<TaskListItem>>(`/tasks?${toQueryString(query)}`),
  detail: (id: string) => apiFetch<TaskDetail>(`/tasks/${id}`),
  history: (id: string) => apiFetch<TaskEvent[]>(`/tasks/${id}/history`),
  // Ces trois endpoints renvoient l'entité Task brute (sans photoCounts/availableTransitions) ;
  // le résultat n'est jamais consommé côté client, qui recharge toujours via GET /tasks/:id après invalidation.
  assign: (id: string, agentId: string) =>
    apiFetch<unknown>(`/tasks/${id}/assign`, { method: 'POST', body: { agentId } }),
  unassign: (id: string) => apiFetch<unknown>(`/tasks/${id}/unassign`, { method: 'POST' }),
  transition: (id: string, to: string, comment?: string) =>
    apiFetch<unknown>(`/tasks/${id}/transition`, { method: 'POST', body: { to, comment } }),
  addNote: (id: string, text: string) => apiFetch<TaskEvent>(`/tasks/${id}/notes`, { method: 'POST', body: { text } }),
};
