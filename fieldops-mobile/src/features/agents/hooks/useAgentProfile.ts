import { useEffect } from 'react';
import { agentsApi } from '../api/agents.api';
import { useDutyStore } from '../store/duty.store';

/** Charge le profil agent (statut de service) une fois authentifié. */
export function useAgentProfile(enabled: boolean): void {
  const setProfile = useDutyStore((s) => s.setProfile);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    agentsApi
      .me()
      .then((profile) => {
        if (!cancelled) setProfile(profile.isOnDuty, profile.status);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, setProfile]);
}
