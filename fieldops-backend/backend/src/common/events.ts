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
} as const;

export interface TaskEventPayload {
  organizationId: string;
  taskId: string;
  reference: string;
  title: string;
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
