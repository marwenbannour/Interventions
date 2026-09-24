'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentLocationHistory } from '../hooks/useAgents';
import type { AgentListItem } from '../types';
import { AgentTrailMap } from './AgentTrailMap';

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(v: string): string {
  return new Date(v).toISOString();
}

export function AgentTrailDialog({
  agent,
  open,
  onOpenChange,
}: {
  agent: AgentListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trajet {agent ? `— ${agent.user.firstName} ${agent.user.lastName}` : ''}</DialogTitle>
        </DialogHeader>
        {/* Remontée à chaque ouverture (clé = agent) : réinitialise la plage de dates sans effet de synchronisation. */}
        {open && agent && <AgentTrailDialogBody key={agent.id} agent={agent} />}
      </DialogContent>
    </Dialog>
  );
}

function AgentTrailDialogBody({ agent }: { agent: AgentListItem }) {
  const [from, setFrom] = useState(startOfTodayIso);
  const [to, setTo] = useState(() => new Date().toISOString());
  const { data, isLoading } = useAgentLocationHistory(agent.userId, from, to);

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trail-from">Du</Label>
          <Input
            id="trail-from"
            type="datetime-local"
            value={toDatetimeLocalValue(from)}
            onChange={(e) => e.target.value && setFrom(fromDatetimeLocalValue(e.target.value))}
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trail-to">Au</Label>
          <Input
            id="trail-to"
            type="datetime-local"
            value={toDatetimeLocalValue(to)}
            onChange={(e) => e.target.value && setTo(fromDatetimeLocalValue(e.target.value))}
            className="w-48"
          />
        </div>
        {data && (
          <p className="ml-auto text-sm text-muted-foreground">
            {data.points.length} position{data.points.length > 1 ? 's' : ''} · {data.distanceKm.toFixed(1)} km
          </p>
        )}
      </div>

      <div className="h-96 w-full overflow-hidden rounded-xl border border-border">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : data && data.points.length > 0 ? (
          <AgentTrailMap points={data.points} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Aucune position enregistrée sur cette période.
          </div>
        )}
      </div>
    </>
  );
}
