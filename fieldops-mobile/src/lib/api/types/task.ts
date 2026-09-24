export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/** Codes du workflow standard — informatif : le set réel dépend de la WorkflowDefinition. */
export type StandardTaskStatus =
  | 'CREATED'
  | 'PLANNED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ON_SITE'
  | 'DIAGNOSIS'
  | 'IN_PROGRESS'
  | 'CONTROL'
  | 'COMPLETED'
  | 'EVALUATED'
  | 'CANCELLED';

export const TERMINAL_STATUSES: readonly string[] = ['COMPLETED', 'EVALUATED', 'CANCELLED'];

export type PhotoType = 'BEFORE' | 'AFTER' | 'PROOF' | 'SIGNATURE' | 'DOCUMENT' | 'ANOMALY';
export type PhotoValidation = 'PENDING' | 'VALIDATED' | 'REJECTED';

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  done: boolean;
  doneAt?: string | null;
  value?: string | null;
}

export interface ClientSnapshot {
  id: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [lng: number, lat: number];
}

export interface SiteSnapshot {
  id: string;
  clientId: string;
  name: string;
  address: string;
  postalCode?: string | null;
  city?: string | null;
  location: GeoPoint | null;
  geofenceMeters?: number | null;
  zoneId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  accessInstructions?: string | null;
  isActive: boolean;
}

export interface MilestoneTimestamps {
  plannedAt?: string | null;
  assignedAt?: string | null;
  acceptedAt?: string | null;
  enRouteAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  evaluatedAt?: string | null;
  cancelledAt?: string | null;
}

export interface SlaSnapshot {
  slaPolicyId?: string | null;
  ackDueAt?: string | null;
  arrivalDueAt?: string | null;
  interventionDueAt?: string | null;
  closeDueAt?: string | null;
  ackBreached: boolean;
  arrivalBreached: boolean;
  interventionBreached: boolean;
  closeBreached: boolean;
  slaAlertsSent: string[];
}

export type PhotoCounts = Partial<Record<PhotoType, { total: number; validated: number }>>;

/** Entité Task complète telle que renvoyée par l'API (GET /tasks, /tasks/:id, /sync/pull). */
export interface Task {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  reference: string;
  title: string;
  description?: string | null;
  type: string;
  priority: TaskPriority;
  status: string;
  workflowId: string;
  workflow?: WorkflowDefinition;
  clientId: string;
  client: ClientSnapshot;
  siteId: string;
  site: SiteSnapshot;
  agentId?: string | null;
  requiredSkills: string[];
  checklist: ChecklistItem[];
  parentTaskId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  estimatedDurationMin?: number | null;
  plannedAt?: string | null;
  assignedAt?: string | null;
  acceptedAt?: string | null;
  enRouteAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  evaluatedAt?: string | null;
  cancelledAt?: string | null;
  slaPolicyId?: string | null;
  ackDueAt?: string | null;
  arrivalDueAt?: string | null;
  interventionDueAt?: string | null;
  closeDueAt?: string | null;
  ackBreached: boolean;
  arrivalBreached: boolean;
  interventionBreached: boolean;
  closeBreached: boolean;
  slaAlertsSent: string[];
  completionNotes?: string | null;
  signatureKey?: string | null;
  signedByName?: string | null;
  version: number;
}

export interface TaskDetail extends Task {
  photoCounts: PhotoCounts;
  availableTransitions: AvailableTransition[];
}

export interface AvailableTransition {
  to: string;
  label: string;
  missing: string[];
  requiresComment: boolean;
  requiresLocation: boolean;
  requiredPhotos: PhotoType[];
  requiresSignature: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}

export interface TaskQuery {
  page?: number;
  limit?: number;
  status?: string;
  active?: boolean;
  updatedSince?: string;
  search?: string;
}

export interface TransitionRequest {
  to: string;
  comment?: string;
  lat?: number;
  lng?: number;
  occurredAt?: string;
}

export interface ChecklistUpdateRequest {
  items: { id: string; done: boolean; value?: string }[];
  occurredAt?: string;
}

export interface NoteRequest {
  text: string;
  occurredAt?: string;
}

/** Réponse de POST/GET /tasks/:id/photos. */
export interface PhotoRecord {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  taskId: string;
  type: PhotoType;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  location: { lat: number; lng: number } | null;
  accuracyMeters: number | null;
  takenAt: string;
  uploadedById: string;
  clientPhotoId: string | null;
  caption: string | null;
  validation: PhotoValidation;
  validatedById: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  url: string | null;
  duplicate: boolean;
}

export interface TaskEvent {
  id: string;
  organizationId: string;
  taskId: string;
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorId?: string | null;
  actorName: string | null;
  comment?: string | null;
  data?: Record<string, unknown> | null;
  location?: GeoPoint | null;
  occurredAt: string;
  recordedAt: string;
  source: 'ONLINE' | 'OFFLINE_SYNC' | 'SYSTEM';
}

/** ---- Workflow (moteur de transitions, cf. workflow-engine.service.ts porté en local en M3) ---- */

export type WorkflowConditionType =
  | 'PHOTO_REQUIRED'
  | 'AGENT_ASSIGNED'
  | 'IS_ASSIGNED_AGENT'
  | 'CHECKLIST_COMPLETE'
  | 'COMMENT_REQUIRED'
  | 'GEOFENCE'
  | 'SIGNATURE_REQUIRED';

export interface WorkflowCondition {
  type: WorkflowConditionType;
  message?: string;
  photoType?: PhotoType;
  minCount?: number;
  validatedOnly?: boolean;
  radiusMeters?: number;
}

export interface WorkflowState {
  code: string;
  label: string;
  final?: boolean;
}

export interface WorkflowTransition {
  from: string | string[] | '*';
  to: string;
  label: string;
  roles: string[];
  conditions?: WorkflowCondition[];
}

export interface WorkflowDefinitionData {
  initialState: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export interface WorkflowDefinition extends WorkflowDefinitionData {
  id: string;
  organizationId: string;
  name: string;
  taskTypes: string[];
  isActive: boolean;
  isDefault: boolean;
  version: number;
}
