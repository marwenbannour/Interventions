export enum MaintenanceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

/**
 * Date de la n-ième occurrence (n = 0 → startAt), calculée depuis l'ancre et non par ajouts
 * successifs : pas de dérive de fin de mois (31/01 → 28/02 → 31/03, et non 28/03).
 * Les calculs se font en UTC ; l'heure de l'ancre est conservée.
 */
export function occurrenceAt(startAt: Date, frequency: MaintenanceFrequency, interval: number, n: number): Date {
  const step = Math.max(1, interval) * n;
  const d = new Date(startAt.getTime());
  switch (frequency) {
    case MaintenanceFrequency.DAILY:
      d.setUTCDate(d.getUTCDate() + step);
      return d;
    case MaintenanceFrequency.WEEKLY:
      d.setUTCDate(d.getUTCDate() + 7 * step);
      return d;
    case MaintenanceFrequency.MONTHLY:
      return addMonthsClamped(startAt, step);
    case MaintenanceFrequency.YEARLY:
      return addMonthsClamped(startAt, 12 * step);
  }
}

function addMonthsClamped(anchor: Date, months: number): Date {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth() + months;
  const targetYear = y + Math.floor(m / 12);
  const targetMonth = ((m % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear, targetMonth, Math.min(anchor.getUTCDate(), lastDay),
      anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(),
    ),
  );
}

/** Premier indice d'occurrence strictement postérieur à `after`. */
export function firstIndexAfter(startAt: Date, frequency: MaintenanceFrequency, interval: number, after: Date, from = 0): number {
  let n = from;
  // Borne de sécurité : 10 000 occurrences (27 ans en quotidien).
  while (n < from + 10_000 && occurrenceAt(startAt, frequency, interval, n).getTime() <= after.getTime()) n++;
  return n;
}
