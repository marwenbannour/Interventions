'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { usePlanningBoard } from '../hooks/usePlanningBoard';
import { TaskColumn } from './TaskColumn';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TaskFilters, type DispatchFilters } from './TaskFilters';

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function KanbanBoard() {
  const [filters, setFilters] = useState<DispatchFilters>({ from: startOfToday(), to: daysFromNow(7) });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { data: board, isLoading, isError } = usePlanningBoard(filters);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <TaskFilters filters={filters} onChange={setFilters} />

      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex flex-1 items-center justify-center text-sm text-destructive">
          Impossible de charger le planning.
        </div>
      )}

      {board && (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-2">
          <TaskColumn
            header={
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Non affectées</span>
                <span className="text-xs text-muted-foreground">{board.unassigned.length}</span>
              </div>
            }
            tasks={board.unassigned}
            onSelectTask={setSelectedTaskId}
            emptyLabel="Rien à affecter"
          />

          {board.agents.map((agent) => (
            <TaskColumn
              key={agent.agentId}
              header={
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 flex-none rounded-full ${agent.isOnDuty ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
                    />
                    <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {agent.tasks.length} tâche{agent.tasks.length > 1 ? 's' : ''} · {Math.round(agent.plannedMinutes / 60)} h
                    prévues
                  </p>
                </div>
              }
              tasks={agent.tasks}
              onSelectTask={setSelectedTaskId}
              emptyLabel="Aucune tâche planifiée"
            />
          ))}

          {board.agents.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">Aucun agent actif pour ces filtres.</p>
          )}
        </div>
      )}

      <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
