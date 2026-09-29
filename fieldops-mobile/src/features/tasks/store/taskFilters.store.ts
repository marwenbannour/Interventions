import { create } from 'zustand';
import { PRIORITY_RANK, statusGroup, type StatusGroup } from '../utils/taskVisuals';
import type { Task as TaskModel } from '../db/models/Task';

export type QuickFilter = 'all' | 'urgent' | 'active' | 'done';
export type Period = 'all' | 'today' | '7d' | '30d';
export type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export interface AdvancedFilters {
  groups: StatusGroup[]; // vide = tous
  priorities: Priority[]; // vide = toutes
  period: Period;
}

export const EMPTY_FILTERS: AdvancedFilters = { groups: [], priorities: [], period: 'all' };

interface TaskFiltersState {
  quick: QuickFilter;
  search: string;
  advanced: AdvancedFilters;
  setQuick: (q: QuickFilter) => void;
  setSearch: (s: string) => void;
  setAdvanced: (a: AdvancedFilters) => void;
}

/** Filtres de la liste d'interventions (partagés entre la liste, l'écran Filtres et le tableau de bord). */
export const useTaskFiltersStore = create<TaskFiltersState>((set) => ({
  quick: 'all',
  search: '',
  advanced: EMPTY_FILTERS,
  setQuick: (quick) => set({ quick }),
  setSearch: (search) => set({ search }),
  setAdvanced: (advanced) => set({ advanced }),
}));

export function countAdvanced(a: AdvancedFilters): number {
  return (a.groups.length ? 1 : 0) + (a.priorities.length ? 1 : 0) + (a.period !== 'all' ? 1 : 0);
}

const PERIOD_DAYS: Record<Exclude<Period, 'all'>, number> = { today: 0, '7d': 7, '30d': 30 };

function inPeriod(task: TaskModel, period: Period): boolean {
  if (period === 'all') return true;
  const reference = task.scheduledStart ?? task.serverUpdatedAt;
  if (!reference) return false;
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - PERIOD_DAYS[period]);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return reference >= from && reference <= to;
}

export function applyTaskFilters(tasks: TaskModel[], quick: QuickFilter, search: string, a: AdvancedFilters): TaskModel[] {
  const q = search.trim().toLowerCase();
  return tasks
    .filter((t) => {
      const group = statusGroup(t.status);
      if (quick === 'urgent' && !(t.priority === 'URGENT' && group !== 'done' && group !== 'cancelled')) return false;
      if (quick === 'active' && group !== 'active' && group !== 'new') return false;
      if (quick === 'done' && group !== 'done') return false;
      if (a.groups.length && !a.groups.includes(group)) return false;
      if (a.priorities.length && !a.priorities.includes(t.priority as Priority)) return false;
      if (!inPeriod(t, a.period)) return false;
      if (q) {
        const haystack = `${t.reference} ${t.title} ${t.site?.name ?? ''} ${t.client?.name ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((x, y) => {
      // À traiter d'abord (non terminées), puis priorité, puis horaire.
      const dx = ['done', 'cancelled'].includes(statusGroup(x.status)) ? 1 : 0;
      const dy = ['done', 'cancelled'].includes(statusGroup(y.status)) ? 1 : 0;
      if (dx !== dy) return dx - dy;
      const pr = (PRIORITY_RANK[x.priority] ?? 9) - (PRIORITY_RANK[y.priority] ?? 9);
      if (pr !== 0) return pr;
      return (x.scheduledStart?.getTime() ?? Infinity) - (y.scheduledStart?.getTime() ?? Infinity);
    });
}
