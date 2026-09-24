import { create } from 'zustand';

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error';

interface SyncStatusState {
  phase: SyncPhase;
  lastSyncedAt: string | null;
  lastError: string | null;
  pendingOpsCount: number;
  set: (partial: Partial<SyncStatusState>) => void;
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  phase: 'idle',
  lastSyncedAt: null,
  lastError: null,
  pendingOpsCount: 0,
  set: (partial) => set(partial),
}));
