import { agentsApi } from '../api/agents.api';
import { useDutyStore } from '../store/duty.store';

export async function toggleDuty(nextOnDuty: boolean): Promise<void> {
  const profile = await agentsApi.setDuty(nextOnDuty);
  useDutyStore.getState().setProfile(profile.isOnDuty, profile.status);
}
