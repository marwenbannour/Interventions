import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { tasksApi } from '@/features/dispatch/api/tasks.api';
import type { TaskListItem } from '@/features/dispatch/types';
import { PRIORITY_RANK, statusGroup, type StatusGroup } from '../utils/visuals';

const DAY = 86_400_000;

function startOfDay(offsetDays = 0): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() + offsetDays * DAY;
}

export interface GroupCounts {
  total: number;
  new: number;
  active: number;
  done: number;
}

function countByGroup(tasks: TaskListItem[]): GroupCounts {
  const counts: GroupCounts = { total: 0, new: 0, active: 0, done: 0 };
  for (const t of tasks) {
    const g: StatusGroup = statusGroup(t.status);
    if (g === 'cancelled') continue;
    counts.total += 1;
    counts[g] += 1;
  }
  return counts;
}

export type Period = 'today' | '7d' | '30d';

export const PERIODS: Record<Period, { label: string; delta: string; startOffset: number }> = {
  today: { label: "Aujourd'hui", delta: "aujourd'hui", startOffset: 0 },
  '7d': { label: '7 derniers jours', delta: 'cette semaine', startOffset: -6 },
  '30d': { label: '30 derniers jours', delta: 'ce mois', startOffset: -29 },
};

/**
 * Données du tableau de bord, calculées sur les interventions des 30 derniers jours
 * (périmètre déjà filtré par l'API selon le rôle : agent, client, superviseur…).
 * `period` pilote les variations « +N » des indicateurs (interventions créées sur la période).
 */
export function useHomeData(period: Period = '7d') {
  const from = useMemo(() => new Date(startOfDay(-30)).toISOString(), []);
  const query = useQuery({
    queryKey: ['home-tasks', from],
    queryFn: () => tasksApi.list({ from, limit: 200 }),
    refetchInterval: 60_000,
  });

  const data = useMemo(() => {
    const tasks = query.data?.data ?? [];
    const periodStart = startOfDay(PERIODS[period].startOffset);
    const createdInPeriod = tasks.filter((t) => new Date(t.createdAt).getTime() >= periodStart);

    const urgent = tasks
      .filter((t) => ['URGENT', 'HIGH'].includes(t.priority) && ['new', 'active'].includes(statusGroup(t.status)))
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

    // Interventions créées par jour sur 7 jours (dont aujourd'hui).
    const trend = Array.from({ length: 7 }, (_, i) => {
      const start = startOfDay(i - 6);
      return {
        day: start,
        count: tasks.filter((t) => {
          const c = new Date(t.createdAt).getTime();
          return c >= start && c < start + DAY;
        }).length,
      };
    });

    const recent = [...tasks].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

    return {
      tasks,
      counts: countByGroup(tasks),
      delta: countByGroup(createdInPeriod),
      urgent,
      trend,
      recent,
      truncated: (query.data?.meta.total ?? 0) > tasks.length,
    };
  }, [query.data, period]);

  return { ...data, isLoading: query.isLoading, isError: query.isError };
}
