import type { MaintenanceFrequency } from '../types';

const UNIT: Record<MaintenanceFrequency, [string, string]> = {
  DAILY: ['jour', 'jours'],
  WEEKLY: ['semaine', 'semaines'],
  MONTHLY: ['mois', 'mois'],
  YEARLY: ['an', 'ans'],
};

export const FREQUENCY_LABEL: Record<MaintenanceFrequency, string> = {
  DAILY: 'Quotidienne',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuelle',
  YEARLY: 'Annuelle',
};

/** « Tous les 3 mois », « Chaque semaine »… */
export function recurrenceLabel(f: MaintenanceFrequency, interval: number): string {
  if (interval <= 1) return `Chaque ${UNIT[f][0]}`.replace('Chaque an', 'Chaque année');
  return `Tous les ${interval} ${UNIT[f][1]}`;
}

export const fmtDate = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(iso)) : '—';
