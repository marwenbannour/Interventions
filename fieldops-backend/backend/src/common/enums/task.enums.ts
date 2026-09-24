export enum TaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/** États du workflow standard (§7). Les workflows personnalisés peuvent définir d'autres codes. */
export enum StandardTaskStatus {
  CREATED = 'CREATED',
  PLANNED = 'PLANNED',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  EN_ROUTE = 'EN_ROUTE',
  ON_SITE = 'ON_SITE',
  DIAGNOSIS = 'DIAGNOSIS',
  IN_PROGRESS = 'IN_PROGRESS',
  CONTROL = 'CONTROL',
  COMPLETED = 'COMPLETED',
  EVALUATED = 'EVALUATED',
  CANCELLED = 'CANCELLED',
}

export enum PhotoType {
  BEFORE = 'BEFORE',
  AFTER = 'AFTER',
  PROOF = 'PROOF',
  SIGNATURE = 'SIGNATURE',
  DOCUMENT = 'DOCUMENT',
  ANOMALY = 'ANOMALY',
}

export enum EventSource {
  ONLINE = 'ONLINE',
  OFFLINE_SYNC = 'OFFLINE_SYNC',
  SYSTEM = 'SYSTEM',
}
