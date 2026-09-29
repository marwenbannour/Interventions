import { Droplets, Hammer, Shirt, Truck, Wrench, type LucideIcon } from 'lucide-react';
import type { TaskListItem, TaskPriority, TaskStatus } from '@/features/dispatch/types';

export type StatusGroup = 'new' | 'active' | 'done' | 'cancelled';

const NEW: TaskStatus[] = ['CREATED', 'PLANNED', 'ASSIGNED'];
const DONE: TaskStatus[] = ['COMPLETED', 'EVALUATED'];

export function statusGroup(status: TaskStatus): StatusGroup {
  if (status === 'CANCELLED') return 'cancelled';
  if (DONE.includes(status)) return 'done';
  if (NEW.includes(status)) return 'new';
  return 'active';
}

export const GROUP_BADGE: Record<StatusGroup, { label: string; className: string }> = {
  new: { label: 'Nouveau', className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  active: { label: 'En cours', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
  done: { label: 'Terminée', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  cancelled: { label: 'Annulée', className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
};

export const PRIORITY_BADGE: Record<TaskPriority, { label: string; className: string; bubble: string }> = {
  URGENT: { label: 'Urgente', className: 'bg-red-600 text-white', bubble: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  HIGH: { label: 'Haute', className: 'bg-orange-500 text-white', bubble: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400' },
  NORMAL: { label: 'Normale', className: 'bg-emerald-600 text-white', bubble: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  LOW: { label: 'Basse', className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', bubble: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
};

export const PRIORITY_RANK: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

const TYPES: Record<string, { label: string; icon: LucideIcon }> = {
  MAINTENANCE: { label: 'Maintenance', icon: Wrench },
  REPAIR: { label: 'Réparation', icon: Hammer },
  LINEN_DELIVERY: { label: 'Livraison linge', icon: Truck },
  LINEN_PICKUP: { label: 'Collecte linge', icon: Shirt },
  PLUMBING: { label: 'Plomberie', icon: Droplets },
};

export function taskType(type: string): { label: string; icon: LucideIcon } {
  return TYPES[type] ?? { label: type.charAt(0) + type.slice(1).toLowerCase(), icon: Wrench };
}

/**
 * Couleur de repère sur la carte : l'urgence prime sur l'état (une urgente non terminée reste rouge).
 * Couleurs de statut réservées, toujours accompagnées de la légende texte.
 */
export type MapTone = 'urgent' | 'new' | 'active' | 'done';

export const MAP_TONES: Record<MapTone, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#DC2626' },
  new: { label: 'Nouvelle', color: '#F59E0B' },
  active: { label: 'En cours', color: '#2563EB' },
  done: { label: 'Terminée', color: '#16A34A' },
};

export function mapTone(task: TaskListItem): MapTone | null {
  const group = statusGroup(task.status);
  if (group === 'cancelled') return null;
  if (task.priority === 'URGENT' && group !== 'done') return 'urgent';
  return group;
}

const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const shortDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

function dayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Heure si aujourd'hui, « Hier », sinon date courte. */
export function whenLabel(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Math.round((dayStart(d) - dayStart(new Date())) / 86_400_000);
  if (diff === 0) return time.format(d);
  if (diff === -1) return 'Hier';
  return shortDay.format(d);
}

export function dayLabel(ts: number): string {
  return shortDay.format(new Date(ts)).replace('.', '');
}
