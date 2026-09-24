import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks.api';

export const taskHistoryQueryKey = (taskId: string) => ['task-history', taskId] as const;

/**
 * Historique serveur complet (toutes sources, tous acteurs) — lecture en ligne uniquement.
 * Les notes locales en attente (task_notes_pending) sont affichées séparément dans
 * HistorySection ; elles disparaissent automatiquement de cette liste locale une fois
 * synchronisées, moment où elles apparaissent ici au prochain refetch (pas de doublon).
 */
export function useTaskHistory(taskId: string | undefined) {
  return useQuery({
    queryKey: taskHistoryQueryKey(taskId ?? ''),
    queryFn: () => tasksApi.history(taskId as string),
    enabled: !!taskId,
  });
}
