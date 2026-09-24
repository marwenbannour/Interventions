export type TaskStatus =
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

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type PhotoType = 'BEFORE' | 'AFTER' | 'PROOF' | 'SIGNATURE' | 'DOCUMENT' | 'ANOMALY';

export interface TaskSlim {
  id: string;
  reference: string;
  title: string;
  type: string;
  priority: TaskPriority;
  status: TaskStatus;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  estimatedDurationMin: number | null;
  site: { id: string; name: string; location: { lat: number; lng: number } | null } | null;
  slaAtRisk: boolean;
}

export interface AgentLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  recordedAt: string;
  stale: boolean;
}

export interface PlanningAgent {
  agentId: string;
  profileId: string;
  name: string;
  skills: string[];
  zoneId: string | null;
  isOnDuty: boolean;
  position: AgentLocation | null;
  plannedMinutes: number;
  tasks: TaskSlim[];
}

export interface PlanningBoard {
  from: string;
  to: string;
  agents: PlanningAgent[];
  unassigned: TaskSlim[];
}

export interface SuggestedAgent {
  agentId: string;
  name: string;
  skills: string[];
  isOnDuty: boolean;
  activeTasks: number;
  maxConcurrentTasks: number;
  distanceKm: number | null;
  qualityScore: number | null;
  full: boolean;
  reasons: string[];
  score: number;
}

export interface SuggestedAgentsResponse {
  taskId: string;
  requiredSkills: string[];
  suggestions: SuggestedAgent[];
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

/** Colonne PostGIS geography(Point,4326) telle que renvoyée brute par TypeORM (coordinates: [lng, lat]). */
export interface GeoJsonPoint {
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
  location: GeoJsonPoint | null;
  geofenceMeters?: number | null;
  zoneId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  accessInstructions?: string | null;
  isActive: boolean;
}

export interface ClientSnapshot {
  id: string;
  name: string;
  code: string;
}

export interface AgentSnapshot {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PhotoCounts {
  [type: string]: number;
}

interface TaskCommon {
  id: string;
  reference: string;
  title: string;
  description?: string | null;
  type: string;
  priority: TaskPriority;
  status: TaskStatus;
  siteId: string;
  clientId: string;
  agentId: string | null;
  requiredSkills: string[];
  checklist: { id: string; label: string; required: boolean; done: boolean; doneAt?: string | null; value?: string | null }[];
  scheduledStart: string | null;
  scheduledEnd: string | null;
  estimatedDurationMin: number | null;
  completionNotes?: string | null;
  site: SiteSnapshot | null;
  client: ClientSnapshot | null;
  agent: AgentSnapshot | null;
}

export interface TaskDetail extends TaskCommon {
  photoCounts: PhotoCounts;
  availableTransitions: AvailableTransition[];
}

/** GET /tasks (liste brute paginée) — mêmes entités que TaskDetail, sans photoCounts/availableTransitions,
 * avec les booléens SLA bruts (slaAtRisk n'existe que dans la projection slim du planning board). */
export interface TaskListItem extends TaskCommon {
  ackBreached: boolean;
  arrivalBreached: boolean;
  interventionBreached: boolean;
  closeBreached: boolean;
}

export type TaskEventType =
  | 'CREATED'
  | 'TRANSITION'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'CHECKLIST'
  | 'NOTE'
  | 'PHOTO'
  | 'PHOTO_VALIDATED'
  | 'PHOTO_REJECTED'
  | 'UPDATED'
  | 'SLA_BREACH'
  | (string & {});

export interface TaskEvent {
  id: string;
  taskId: string;
  type: TaskEventType;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  comment?: string | null;
  data?: Record<string, unknown> | null;
  occurredAt: string;
}

export interface TaskQuery {
  status?: TaskStatus;
  agentId?: string;
  clientId?: string;
  siteId?: string;
  type?: string;
  priority?: TaskPriority;
  from?: string;
  to?: string;
  search?: string;
  active?: boolean;
  slaBreached?: boolean;
  page?: number;
  limit?: number;
}

export type PhotoValidation = 'PENDING' | 'VALIDATED' | 'REJECTED';

export interface Photo {
  id: string;
  taskId: string;
  type: PhotoType;
  contentType: string;
  sizeBytes: number;
  takenAt: string;
  uploadedById: string;
  caption?: string | null;
  validation: PhotoValidation;
  validatedById?: string | null;
  validatedAt?: string | null;
  rejectionReason?: string | null;
  location: GeoJsonPoint | null;
  url: string | null;
}

export interface Zone {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
}
