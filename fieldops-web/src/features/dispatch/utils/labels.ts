import type { TaskEvent, TaskPriority, TaskStatus } from '../types';

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Créée',
  PLANNED: 'Planifiée',
  ASSIGNED: 'Affectée',
  ACCEPTED: 'Acceptée',
  EN_ROUTE: 'En route',
  ON_SITE: 'Sur site',
  DIAGNOSIS: 'Diagnostic',
  IN_PROGRESS: 'En cours',
  CONTROL: 'Contrôle',
  COMPLETED: 'Terminée',
  EVALUATED: 'Évaluée',
  CANCELLED: 'Annulée',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  NORMAL: 'Normale',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};

const PHOTO_TYPE_LABELS: Record<string, string> = {
  BEFORE: 'Avant',
  AFTER: 'Après',
  PROOF: 'Preuve',
  SIGNATURE: 'Signature',
  DOCUMENT: 'Document',
  ANOMALY: 'Anomalie',
};

export const statusLabel = (status: TaskStatus | string): string => STATUS_LABELS[status] ?? status;
export const priorityLabel = (priority: TaskPriority | string): string => PRIORITY_LABELS[priority] ?? priority;
export const photoTypeLabel = (type: string): string => PHOTO_TYPE_LABELS[type] ?? type;

const TERMINAL_STATUSES: Set<TaskStatus> = new Set(['COMPLETED', 'EVALUATED', 'CANCELLED']);
export const isTerminalStatus = (status: TaskStatus): boolean => TERMINAL_STATUSES.has(status);

export const priorityBadgeVariant = (priority: TaskPriority): 'destructive' | 'default' | 'secondary' | 'outline' => {
  if (priority === 'URGENT') return 'destructive';
  if (priority === 'HIGH') return 'default';
  return 'secondary';
};

const ORIGIN_LABELS: Record<string, string> = {
  MANUAL: 'Saisie opérateur',
  CLIENT_REQUEST: 'Demande client',
  PREVENTIVE: 'Maintenance préventive',
  API: 'Intégration (API)',
};
export const originLabel = (origin: string): string => ORIGIN_LABELS[origin] ?? origin;

export function eventSummary(event: TaskEvent): string {
  switch (event.type) {
    case 'CREATED':
      return 'Intervention créée';
    case 'TRANSITION':
      if (event.data?.assetScanned) {
        const how = event.data.assetScanMethod === 'MANUAL' ? 'code saisi manuellement' : 'QR scanné';
        return `${statusLabel(event.fromStatus ?? '')} → ${statusLabel(event.toStatus ?? '')} (${String(event.data.assetScanned)} — ${how})`;
      }
      return event.fromStatus && event.toStatus
        ? `${statusLabel(event.fromStatus)} → ${statusLabel(event.toStatus)}`
        : event.toStatus
          ? `Passage à « ${statusLabel(event.toStatus)} »`
          : 'Changement de statut';
    case 'ASSIGNED':
      return event.data?.auto ? 'Affectée automatiquement (auto-dispatch)' : 'Affectée à un agent';
    case 'UNASSIGNED':
      return 'Désaffectée';
    case 'CHECKLIST':
      return 'Checklist mise à jour';
    case 'NOTE':
      return event.comment ?? 'Note ajoutée';
    case 'PHOTO':
      return 'Photo ajoutée';
    case 'PHOTO_VALIDATED':
      return 'Photo validée';
    case 'PHOTO_REJECTED':
      return 'Photo rejetée';
    case 'UPDATED':
      return 'Intervention modifiée';
    case 'SLA_BREACH':
      return 'Dépassement de délai SLA';
    case 'REPORT_GENERATED':
      return event.data?.regenerated ? "Rapport d'intervention régénéré" : "Rapport d'intervention généré";
    default:
      return event.type;
  }
}
