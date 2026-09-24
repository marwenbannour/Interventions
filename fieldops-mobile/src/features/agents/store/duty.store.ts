import { create } from 'zustand';
import type { AgentStatus } from '../../../lib/api/types';

interface DutyState {
  isOnDuty: boolean;
  status: AgentStatus | null;
  setProfile: (isOnDuty: boolean, status: AgentStatus) => void;
}

export const useDutyStore = create<DutyState>((set) => ({
  isOnDuty: false,
  status: null,
  setProfile: (isOnDuty, status) => set({ isOnDuty, status }),
}));
