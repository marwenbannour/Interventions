'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useTasksList } from '@/features/dispatch/hooks/useTasksList';
import { priorityBadgeVariant, priorityLabel, statusLabel } from '@/features/dispatch/utils/labels';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

export function ClientTasksView() {
  const { data, isLoading } = useTasksList({ limit: 50 });
  const tasks = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Mes interventions</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.meta.total} intervention${data.meta.total > 1 ? 's' : ''}` : 'Chargement…'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/client/${task.id}`}
              className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">{task.reference}</span>
                <Badge variant={priorityBadgeVariant(task.priority)} className="text-[10px]">
                  {priorityLabel(task.priority)}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-foreground">{task.title}</p>
              <p className="text-xs text-muted-foreground">{task.site?.name ?? '—'}</p>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="font-medium text-primary">{statusLabel(task.status)}</span>
                <span className="text-muted-foreground">{formatDateTime(task.scheduledStart)}</span>
              </div>
            </Link>
          ))}
          {tasks.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">Aucune intervention pour le moment.</p>
          )}
        </div>
      )}
    </div>
  );
}
