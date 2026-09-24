import { apiFetch } from '@/lib/api/client';
import type { Photo } from '../types';

export const photosApi = {
  list: (taskId: string) => apiFetch<Photo[]>(`/tasks/${taskId}/photos`),
  validate: (photoId: string, valid: boolean, reason?: string) =>
    apiFetch<Photo>(`/photos/${photoId}/validate`, { method: 'POST', body: { valid, reason } }),
};
