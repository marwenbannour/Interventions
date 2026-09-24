import { useQuery } from '@tanstack/react-query';
import { agentsApi } from '../../agents/api/agents.api';

/** Profil agent complet (compétences, véhicule, score qualité) — lecture en ligne uniquement. */
export function useAgentProfileQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['agent-profile'],
    queryFn: () => agentsApi.me(),
    enabled,
  });
}
