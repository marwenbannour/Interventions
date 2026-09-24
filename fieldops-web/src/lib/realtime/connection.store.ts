import { create } from 'zustand';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export const useConnectionStore = create<{
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
}));
