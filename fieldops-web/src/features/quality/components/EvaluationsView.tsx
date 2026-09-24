'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAgents } from '@/features/agents/hooks/useAgents';
import { useClients } from '@/features/clients/hooks/useClients';
import { useEvaluations } from '../hooks/useEvaluations';
import { StarRating } from './StarRating';

const ALL = '__all__';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

export function EvaluationsView() {
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [agentId, setAgentId] = useState<string | undefined>(undefined);

  const { data: clientsPage } = useClients();
  const { data: agentsPage } = useAgents();
  const { data, isLoading } = useEvaluations({ clientId, agentId });

  const clients = clientsPage?.data ?? [];
  const agents = agentsPage?.data ?? [];
  const evaluations = data?.data ?? [];
  const agentName = (id: string | null) => {
    if (!id) return 'Agent non affecté';
    const agent = agents.find((a) => a.userId === id);
    return agent ? `${agent.user.firstName} ${agent.user.lastName}` : id;
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Qualité</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.meta.total} évaluation${data.meta.total > 1 ? 's' : ''}` : 'Chargement…'}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Client</Label>
          <Select value={clientId ?? ALL} onValueChange={(v) => setClientId(v && v !== ALL ? v : undefined)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tous les clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Agent</Label>
          <Select value={agentId ?? ALL} onValueChange={(v) => setAgentId(v && v !== ALL ? v : undefined)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tous les agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.userId} value={a.userId}>
                  {a.user.firstName} {a.user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{evaluation.taskTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {evaluation.taskReference} · {agentName(evaluation.agentId)} · {formatDate(evaluation.createdAt)}
                </p>
                {evaluation.comment && <p className="mt-1 text-sm text-foreground">&ldquo;{evaluation.comment}&rdquo;</p>}
              </div>
              <div className="flex flex-none gap-3">
                <StarRating value={evaluation.rating} label="Global" />
                <StarRating value={evaluation.punctualityRating} label="Ponctualité" />
                <StarRating value={evaluation.qualityRating} label="Qualité" />
              </div>
            </div>
          ))}
          {evaluations.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune évaluation pour ces filtres.</p>
          )}
        </div>
      )}
    </div>
  );
}
