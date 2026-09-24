import { AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TaskSlim } from '../types';
import { priorityBadgeVariant, priorityLabel, statusLabel } from '../utils/labels';

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

export function TaskCard({ task, onClick }: { task: TaskSlim; onClick: () => void }) {
  const scheduled = formatTime(task.scheduledStart);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-1.5 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{task.reference}</span>
        <Badge variant={priorityBadgeVariant(task.priority)} className="text-[10px]">
          {priorityLabel(task.priority)}
        </Badge>
      </div>
      <p className="text-sm font-semibold leading-snug text-foreground">{task.title}</p>
      {task.site && <p className="text-xs text-muted-foreground">{task.site.name}</p>}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">{statusLabel(task.status)}</span>
        <div className="flex items-center gap-2">
          {scheduled && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {scheduled}
            </span>
          )}
          {task.slaAtRisk && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-destructive">
              <AlertTriangle className="size-3" />
              SLA
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
