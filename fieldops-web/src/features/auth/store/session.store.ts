import { create } from 'zustand';
import type { User } from '@/lib/api/types';

interface SessionState {
  accessToken: string | null;
  user: User | null;
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  setSession: (accessToken: string, user: User) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  user: null,
  status: 'unknown',
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  setAccessToken: (accessToken) => set({ accessToken, status: 'authenticated' }),
  clearSession: () => set({ accessToken: null, user: null, status: 'unauthenticated' }),
}));

/** Lecture hors composant React (ex: intercepteur du client API). */
export function getAccessToken(): string | null {
  return useSessionStore.getState().accessToken;
}
