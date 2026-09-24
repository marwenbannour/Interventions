'use client';

import { Loader2 } from 'lucide-react';
import { useAgents, useLiveLocations } from '../hooks/useAgents';
import { useAgentsRealtimeSync } from '../hooks/useAgentsRealtimeSync';
import { AgentMap } from './AgentMap';
import { AgentRosterList } from './AgentRosterList';

export function AgentsView() {
  const { data: agentsPage, isLoading: agentsLoading } = useAgents();
  const { data: positions } = useLiveLocations();
  useAgentsRealtimeSync();

  const agents = agentsPage?.data ?? [];
  const livePositions = positions ?? [];
  const onDutyCount = agents.filter((a) => a.isOnDuty).length;

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Agents</h1>
        <p className="text-sm text-muted-foreground">
          {agentsLoading
            ? 'Chargement…'
            : `${onDutyCount} en service sur ${agents.length} · ${livePositions.length} position${livePositions.length > 1 ? 's' : ''} live`}
        </p>
      </div>

      {agentsLoading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden">
          <AgentRosterList agents={agents} positions={livePositions} />
          <div className="min-w-0 flex-1">
            {livePositions.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                Aucune position récente à afficher pour le moment.
              </div>
            ) : (
              <AgentMap agents={agents} positions={livePositions} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
