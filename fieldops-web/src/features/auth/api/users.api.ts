import { apiFetch } from '@/lib/api/client';
import type { User } from '@/lib/api/types';

export const usersApi = {
  me: () => apiFetch<User>('/users/me'),
};
