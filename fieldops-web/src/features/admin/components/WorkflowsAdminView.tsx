'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useWorkflowsAdmin } from '../hooks/useWorkflows';
import { WorkflowDetailSheet } from './WorkflowDetailSheet';
import type { WorkflowDefinition } from '../types';

export function WorkflowsAdminView() {
  const { data: workflows, isLoading } = useWorkflowsAdmin();
  const [selected, setSelected] = useState<WorkflowDefinition | null>(null);

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Workflows</h1>
        <p className="text-sm text-muted-foreground">
          Consultation des workflows configurés. La création/modification se fait via l&apos;API (hors périmètre de
          cette itération).
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex flex-col gap-2">
          {workflows?.map((wf) => (
            <button
              key={wf.id}
              type="button"
              onClick={() => setSelected(wf)}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{wf.name}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {wf.code}
                  </Badge>
                  {wf.isDefault && (
                    <Badge variant="outline" className="text-[10px]">
                      Par défaut
                    </Badge>
                  )}
                  {!wf.isActive && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Inactif
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {wf.taskTypes.join(', ')} · {wf.states.length} états · {wf.transitions.length} transitions
                </p>
              </div>
            </button>
          ))}
          {workflows?.length === 0 && <p className="text-sm text-muted-foreground">Aucun workflow.</p>}
        </div>
      )}

      <WorkflowDetailSheet workflow={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
