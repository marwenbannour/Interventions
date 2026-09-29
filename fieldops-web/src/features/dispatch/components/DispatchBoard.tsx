'use client';

import { Kanban, Plus, Table2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/features/auth/store/session.store';
import { canCreateTasks } from '@/lib/auth/permissions';
import { useDispatchRealtimeSync } from '../hooks/useDispatchRealtimeSync';
import { CreateTaskDialog } from './CreateTaskDialog';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TasksTable } from './TasksTable';

type ViewMode = 'kanban' | 'table';

export function DispatchBoard() {
  const [view, setView] = useState<ViewMode>('kanban');
  const [createOpen, setCreateOpen] = useState(false);
  const role = useSessionStore((s) => s.user?.role);
  useDispatchRealtimeSync();

  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkedTaskId = searchParams.get('taskId');
  const clearDeepLink = () => router.replace('/dispatch');

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dispatch</h1>
          <p className="text-sm text-muted-foreground">
            {view === 'kanban' ? 'Planning par agent.' : 'Recherche et filtres sur toutes les interventions.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
        {role && canCreateTasks(role) && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nouvelle intervention
          </Button>
        )}
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <Button
            variant={view === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('kanban')}
            className="h-7 px-2.5"
          >
            <Kanban className="size-3.5" />
            Kanban
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('table')}
            className="h-7 px-2.5"
          >
            <Table2 className="size-3.5" />
            Tableau
          </Button>
        </div>
        </div>
      </div>

      {view === 'kanban' ? <KanbanBoard /> : <TasksTable />}

      {deepLinkedTaskId && <TaskDetailPanel taskId={deepLinkedTaskId} onClose={clearDeepLink} />}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => router.replace(`/dispatch?taskId=${id}`)}
      />
    </div>
  );
}
