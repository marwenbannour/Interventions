import { CheckCircle2, Pencil, PlusCircle, XCircle, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { TaskListItem } from '@/features/dispatch/types';
import { statusLabel } from '@/features/dispatch/utils/labels';
import { statusGroup, whenLabel } from '../utils/visuals';

function describe(task: TaskListItem): { title: string; icon: LucideIcon; className: string } {
  const group = statusGroup(task.status);
  if (group === 'done') return { title: 'Intervention terminée', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' };
  if (group === 'cancelled') return { title: 'Intervention annulée', icon: XCircle, className: 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-300' };
  // Création sans modification ultérieure : les deux horodatages sont (quasi) identiques.
  if (Math.abs(new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime()) < 60_000) {
    return { title: 'Nouvelle intervention créée', icon: PlusCircle, className: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' };
  }
  return { title: `Mise à jour — ${statusLabel(task.status)}`, icon: Pencil, className: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' };
}

export function RecentActivity({ tasks }: { tasks: TaskListItem[] }) {
  if (tasks.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">Aucune activité récente.</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {tasks.map((task) => {
        const d = describe(task);
        const Icon = d.icon;
        return (
          <li key={task.id}>
            <Link href={`/dispatch?taskId=${task.id}`} className="flex items-center gap-3 py-2.5 hover:bg-muted/40">
              <span className={`flex size-9 flex-none items-center justify-center rounded-full ${d.className}`}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{d.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {task.reference} · {task.title}
                  {task.site ? ` · ${task.site.name}` : ''}
                </span>
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{whenLabel(task.updatedAt)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
