import { apiFetch } from '../../../lib/api/client';
import type {
  ChecklistUpdateRequest,
  NoteRequest,
  Paginated,
  Task,
  TaskDetail,
  TaskEvent,
  TaskQuery,
  TransitionRequest,
} from '../../../lib/api/types';

function toQueryString(query: TaskQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const tasksApi = {
  list: (query: TaskQuery = {}) => apiFetch<Paginated<Task>>(`/tasks${toQueryString(query)}`),

  detail: (id: string) => apiFetch<TaskDetail>(`/tasks/${id}`),

  history: (id: string) => apiFetch<TaskEvent[]>(`/tasks/${id}/history`),

  transition: (id: string, body: TransitionRequest) =>
    apiFetch<Task>(`/tasks/${id}/transition`, { method: 'POST', body }),

  updateChecklist: (id: string, body: ChecklistUpdateRequest) =>
    apiFetch<Task>(`/tasks/${id}/checklist`, { method: 'PATCH', body }),

  addNote: (id: string, body: NoteRequest) => apiFetch<TaskEvent>(`/tasks/${id}/notes`, { method: 'POST', body }),
};
