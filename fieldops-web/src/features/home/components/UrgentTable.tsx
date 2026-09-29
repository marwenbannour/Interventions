import { ChevronRight, Siren } from 'lucide-react';
import Link from 'next/link';
import type { TaskListItem } from '@/features/dispatch/types';
import { GROUP_BADGE, PRIORITY_BADGE, statusGroup, taskType, whenLabel } from '../utils/visuals';

export function UrgentTable({ tasks }: { tasks: TaskListItem[] }) {
  if (tasks.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Aucune intervention urgente en cours. 🎉</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/70 text-left text-xs text-muted-foreground">
            <th className="rounded-l-lg px-2 py-2.5 font-medium">Intervention</th>
            <th className="hidden px-2 py-2.5 font-medium min-[1800px]:table-cell">Type</th>
            <th className="px-2 py-2.5 font-medium">Priorité</th>
            <th className="hidden px-2 py-2.5 font-medium sm:table-cell">Statut</th>
            <th className="hidden px-2 py-2.5 font-medium min-[420px]:table-cell">Heure</th>
            <th className="hidden rounded-r-lg px-2 py-2.5 sm:table-cell" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const priority = PRIORITY_BADGE[task.priority];
            const group = GROUP_BADGE[statusGroup(task.status)];
            const type = taskType(task.type);
            const TypeIcon = type.icon;
            return (
              <tr key={task.id} className="group border-b border-border last:border-0">
                <td className="px-2 py-3">
                  <Link href={`/dispatch?taskId=${task.id}`} className="flex items-center gap-2.5 sm:gap-3">
                    <span className={`flex size-9 flex-none items-center justify-center rounded-full ${priority.bubble}`}>
                      <Siren className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground">{task.reference}</span>
                      <span className="block max-w-32 truncate sm:max-w-48 text-foreground">{task.title}</span>
                      <span className="block max-w-32 truncate sm:max-w-48 text-xs text-muted-foreground">{task.site?.name ?? '—'}</span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-2 py-3 min-[1800px]:table-cell">
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
                    <TypeIcon className="size-4" />
                    {type.label}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${priority.className}`}>{priority.label}</span>
                </td>
                <td className="hidden px-2 py-3 sm:table-cell">
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${group.className}`}>{group.label}</span>
                </td>
                <td className="hidden px-2 py-3 tabular-nums text-muted-foreground min-[420px]:table-cell">{whenLabel(task.scheduledStart ?? task.createdAt)}</td>
                <td className="hidden px-2 py-3 sm:table-cell">
                  <Link href={`/dispatch?taskId=${task.id}`} aria-label={`Ouvrir ${task.reference}`}>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
