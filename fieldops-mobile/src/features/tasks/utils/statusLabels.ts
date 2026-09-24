const LABELS: Record<string, string> = {
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

/** Libellé par défaut si le code n'est pas dans le workflow standard (workflows custom §workflow.states[].label prime en M3). */
export const statusLabel = (status: string): string => LABELS[status] ?? status;
export const priorityLabel = (priority: string): string => PRIORITY_LABELS[priority] ?? priority;
export const photoTypeLabel = (type: string): string => PHOTO_TYPE_LABELS[type] ?? type;
