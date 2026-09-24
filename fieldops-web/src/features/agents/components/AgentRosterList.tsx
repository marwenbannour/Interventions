'use client';

import { Loader2, Route } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/features/auth/store/session.store';
import { ApiError } from '@/lib/api/errors';
import { canManageAgents } from '@/lib/auth/permissions';
import { useSetAgentStatus } from '../hooks/useAgents';
import type { AgentListItem, LivePosition } from '../types';
import { AgentTrailDialog } from './AgentTrailDialog';

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.round(minutes / 60)} h`;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'secondary' | 'destructive' }> = {
  PENDING_VALIDATION: { label: 'En attente de validation', variant: 'secondary' },
  SUSPENDED: { label: 'Suspendu', variant: 'destructive' },
};

function AgentRow({
  agent,
  position,
  canManage,
  onShowTrail,
}: {
  agent: AgentListItem;
  position?: LivePosition;
  canManage: boolean;
  onShowTrail: () => void;
}) {
  const setStatus = useSetAgentStatus();
  const badge = STATUS_BADGE[agent.status];

  const changeStatus = async (status: AgentListItem['status']) => {
    try {
      await setStatus.mutateAsync({ agentProfileId: agent.id, status });
      toast.success(status === 'ACTIVE' ? 'Agent validé.' : 'Agent suspendu.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Action impossible.');
    }
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`size-2 flex-none rounded-full ${agent.isOnDuty ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
          <span className="text-sm font-semibold text-foreground">
            {agent.user.firstName} {agent.user.lastName}
          </span>
        </div>
        <div className="flex flex-none items-center gap-2">
          {agent.qualityScore != null && (
            <span className="text-xs font-medium text-amber-600">★ {Math.round(Number(agent.qualityScore))}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {agent.activeTasks} tâche{agent.activeTasks > 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {agent.skills.map((skill) => (
          <Badge key={skill} variant="secondary" className="text-[10px]">
            {skill}
          </Badge>
        ))}
        {badge && (
          <Badge variant={badge.variant} className="text-[10px]">
            {badge.label}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {position ? `Position ${timeAgo(position.recordedAt)}` : 'Aucune position récente'}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={onShowTrail}>
          <Route className="size-3.5" />
          Trajet
        </Button>
        {canManage && agent.status !== 'ACTIVE' && (
          <Button size="sm" variant="outline" onClick={() => changeStatus('ACTIVE')} disabled={setStatus.isPending}>
            {setStatus.isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Valider'}
          </Button>
        )}
        {canManage && agent.status === 'ACTIVE' && (
          <Button size="sm" variant="outline" onClick={() => changeStatus('SUSPENDED')} disabled={setStatus.isPending}>
            {setStatus.isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Suspendre'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function AgentRosterList({ agents, positions }: { agents: AgentListItem[]; positions: LivePosition[] }) {
  const positionByAgent = new Map(positions.map((p) => [p.agentId, p]));
  const role = useSessionStore((s) => s.user?.role);
  const canManage = !!role && canManageAgents(role);
  const [trailAgent, setTrailAgent] = useState<AgentListItem | null>(null);

  return (
    <div className="flex w-72 flex-none flex-col gap-2 overflow-y-auto">
      {agents.map((agent) => (
        <AgentRow
          key={agent.id}
          agent={agent}
          position={positionByAgent.get(agent.userId)}
          canManage={canManage}
          onShowTrail={() => setTrailAgent(agent)}
        />
      ))}
      {agents.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucun agent.</p>}

      <AgentTrailDialog agent={trailAgent} open={trailAgent !== null} onOpenChange={(open) => !open && setTrailAgent(null)} />
    </div>
  );
}
