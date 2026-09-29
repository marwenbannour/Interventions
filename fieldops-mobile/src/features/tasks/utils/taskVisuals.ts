import type { IconName } from '../../../components/ui/Icon';
import type { Tone } from '../../../theme/palette';

export type StatusGroup = 'new' | 'active' | 'done' | 'cancelled';

const NEW_STATUSES = ['CREATED', 'PLANNED', 'ASSIGNED'];
const DONE_STATUSES = ['COMPLETED', 'EVALUATED'];

/** Regroupement des statuts du workflow en quatre familles (tuiles, filtres, badges). */
export function statusGroup(status: string): StatusGroup {
  if (status === 'CANCELLED') return 'cancelled';
  if (DONE_STATUSES.includes(status)) return 'done';
  if (NEW_STATUSES.includes(status)) return 'new';
  return 'active';
}

export const STATUS_GROUP_LABEL: Record<StatusGroup, string> = {
  new: 'Nouvelle',
  active: 'En cours',
  done: 'Terminée',
  cancelled: 'Annulée',
};

export function statusTone(status: string): Tone {
  const group = statusGroup(status);
  if (group === 'new') return 'primary';
  if (group === 'active') return 'success';
  if (group === 'done') return 'secondary';
  return 'muted';
}

export function priorityTone(priority: string): Tone {
  if (priority === 'URGENT') return 'danger';
  if (priority === 'HIGH') return 'warning';
  if (priority === 'NORMAL') return 'success';
  return 'muted';
}

/** Rang de tri : urgente d'abord. */
export const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

export function taskTypeIcon(type: string): IconName {
  switch (type) {
    case 'MAINTENANCE':
      return 'build';
    case 'REPAIR':
      return 'handyman';
    case 'LINEN_DELIVERY':
      return 'local-shipping';
    case 'LINEN_PICKUP':
      return 'local-laundry-service';
    case 'CLEANING':
      return 'cleaning-services';
    default:
      return 'assignment';
  }
}

const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** « 09:30 • Aujourd'hui », « Hier • 15:20 », « 12/10 • 08:00 ». */
export function formatWhen(date: Date | null | undefined): string {
  if (!date) return 'Non planifiée';
  const diffDays = Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000);
  if (diffDays === 0) return `${time.format(date)} • Aujourd'hui`;
  if (diffDays === -1) return `Hier • ${time.format(date)}`;
  if (diffDays === 1) return `Demain • ${time.format(date)}`;
  return `${day.format(date)} • ${time.format(date)}`;
}

/** Heure si aujourd'hui, « Hier », sinon date courte (liste de notifications). */
export function formatShortWhen(iso: string): string {
  const date = new Date(iso);
  const diffDays = Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000);
  if (diffDays === 0) return time.format(date);
  if (diffDays === -1) return 'Hier';
  return day.format(date);
}

export function isToday(date: Date | null | undefined): boolean {
  return !!date && startOfDay(date) === startOfDay(new Date());
}
