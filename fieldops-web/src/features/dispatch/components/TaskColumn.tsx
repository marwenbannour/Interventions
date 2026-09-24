import { TaskCard } from './TaskCard';
import type { TaskSlim } from '../types';

export function TaskColumn({
  header,
  tasks,
  onSelectTask,
  emptyLabel = 'Aucune intervention',
}: {
  header: React.ReactNode;
  tasks: TaskSlim[];
  onSelectTask: (id: string) => void;
  emptyLabel?: string;
}) {
  return (
    <div className="flex w-72 flex-none flex-col rounded-xl border border-border bg-muted/40">
      <div className="border-b border-border p-3">{header}</div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task.id)} />
        ))}
        {tasks.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>}
      </div>
    </div>
  );
}
