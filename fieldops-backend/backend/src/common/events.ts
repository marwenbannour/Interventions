/** Événements métier internes (EventEmitter2) — découplent les modules (§4). */
export const Events = {
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_ASSIGNED: 'task.assigned',
  TASK_TRANSITIONED: 'task.transitioned',
  WORKFLOW_NOTIFY: 'workflow.notify',
  PHOTO_ADDED: 'photo.added',
  SLA_WARNING: 'sla.warning',
  SLA_BREACHED: 'sla.breached',
  EVALUATION_CREATED: 'evaluation.created',
  LOCATION_UPDATED: 'location.updated',
  NOTIFICATION_CREATED: 'notification.created',
  // ---- V3
  TASK_REWORK_DETECTED: 'task.rework_detected',
  REPORT_GENERATED: 'report.generated',
  ASSET_SCANNED: 'asset.scanned',
  MAINTENANCE_GENERATED: 'maintenance.generated',
} as const;

/** Événements exposables aux intégrations externes (webhooks). */
export const WEBHOOK_EVENTS = [
  Events.TASK_CREATED,
  Events.TASK_ASSIGNED,
  Events.TASK_TRANSITIONED,
  Events.SLA_WARNING,
  Events.SLA_BREACHED,
  Events.EVALUATION_CREATED,
  Events.TASK_REWORK_DETECTED,
  Events.REPORT_GENERATED,
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface TaskEventPayload {
  organizationId: string;
  taskId: string;
  reference: string;
  title: string;
  /**
   * Titre de l'intervention, jamais écrasé : WorkflowNotifyPayload redéfinit `title`
   * (titre de la notification), ce qui masquait le titre de la tâche dans le gabarit {title}.
   */
  taskTitle?: string;
  status: string;
  agentId?: string | null;
  clientId: string;
  siteId: string;
  actorId?: string | null;
}

export interface TaskTransitionedPayload extends TaskEventPayload {
  from: string;
  to: string;
}

export interface TaskAssignedPayload extends TaskEventPayload {
  previousAgentId?: string | null;
}

export interface WorkflowNotifyPayload extends TaskEventPayload {
  targets: string[];
  title: string;
  body: string;
  channels?: string[];
}

export interface SlaEventPayload extends TaskEventPayload {
  metric: 'ack' | 'arrival' | 'intervention' | 'close';
  dueAt: string;
}

export interface LocationUpdatedPayload {
  organizationId: string;
  agentId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  battery?: number | null;
  taskId?: string | null;
  recordedAt: string;
}
