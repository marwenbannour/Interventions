'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useTasksList } from '../hooks/useTasksList';
import { priorityBadgeVariant, priorityLabel, statusLabel } from '../utils/labels';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TasksTableFilters } from './TasksTableFilters';
import type { TaskListItem, TaskQuery } from '../types';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

function slaAtRisk(task: TaskListItem): boolean {
  return task.ackBreached || task.arrivalBreached || task.interventionBreached || task.closeBreached;
}

export function TasksTable() {
  const [query, setQuery] = useState<TaskQuery>({ limit: 50 });
  const { data, isLoading } = useTasksList(query);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const tasks = data?.data ?? [];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.meta.total} intervention${data.meta.total > 1 ? 's' : ''}` : 'Chargement…'}
        </p>
      </div>

      <TasksTableFilters query={query} onChange={setQuery} />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Référence</th>
                <th className="px-4 py-2 font-medium">Titre</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2 font-medium">Priorité</th>
                <th className="px-4 py-2 font-medium">Planifiée</th>
                <th className="px-4 py-2 font-medium">SLA</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-accent/50"
                >
                  <td className="px-4 py-2 font-medium text-foreground">{task.reference}</td>
                  <td className="max-w-56 truncate px-4 py-2 text-foreground">{task.title}</td>
                  <td className="px-4 py-2 text-muted-foreground">{task.site?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{task.client?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {task.agent ? `${task.agent.firstName} ${task.agent.lastName}` : 'Non affectée'}
                  </td>
                  <td className="px-4 py-2 text-foreground">{statusLabel(task.status)}</td>
                  <td className="px-4 py-2">
                    <Badge variant={priorityBadgeVariant(task.priority)} className="text-[10px]">
                      {priorityLabel(task.priority)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{formatDateTime(task.scheduledStart)}</td>
                  <td className="px-4 py-2">
                    {slaAtRisk(task) && (
                      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertTriangle className="size-3.5" />
                        Risque
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Aucune intervention pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
