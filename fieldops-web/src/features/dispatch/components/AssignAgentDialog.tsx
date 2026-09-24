'use client';

import { Loader2, MapPin } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiError } from '@/lib/api/errors';
import { useSuggestedAgents } from '../hooks/useSuggestedAgents';
import { useAssignTask } from '../hooks/useTaskActions';

export function AssignAgentDialog({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading, isError } = useSuggestedAgents(taskId, open);
  const candidates = data?.suggestions;
  const assign = useAssignTask(taskId);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const handleAssign = async (agentId: string) => {
    setAssigningId(agentId);
    try {
      await assign.mutateAsync(agentId);
      toast.success('Intervention affectée.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Affectation impossible.");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Affecter un agent</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}

        {isError && <p className="py-4 text-sm text-destructive">Impossible de charger les suggestions.</p>}

        {candidates && candidates.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">Aucun agent disponible avec les compétences requises.</p>
        )}

        {candidates && candidates.length > 0 && (
          <div className="flex flex-col gap-2">
            {candidates.map((agent) => (
              <div
                key={agent.agentId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 flex-none rounded-full ${agent.isOnDuty ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
                    />
                    <p className="truncate text-sm font-semibold text-foreground">{agent.name}</p>
                    {agent.full && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Complet
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {agent.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {agent.distanceKm != null && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="size-3" />
                        {agent.distanceKm} km
                      </span>
                    )}
                    {agent.reasons.join(' · ')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAssign(agent.agentId)}
                  disabled={assigningId !== null}
                >
                  {assigningId === agent.agentId ? <Loader2 className="size-4 animate-spin" /> : 'Choisir'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
