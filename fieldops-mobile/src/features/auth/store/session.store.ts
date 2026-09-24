import { create } from 'zustand';
import type { User } from '../../../lib/api/types';

export type SessionStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  user: User | null;
  setSession: (accessToken: string, user: User) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'checking',
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ status: 'authenticated', accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearSession: () => set({ status: 'unauthenticated', accessToken: null, user: null }),
}));

/** Accès hors composant React (intercepteurs réseau, services background). */
export const sessionStore = {
  getAccessToken: () => useSessionStore.getState().accessToken,
  getUser: () => useSessionStore.getState().user,
};
