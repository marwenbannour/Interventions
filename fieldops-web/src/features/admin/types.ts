export interface Zone {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

export interface Team {
  id: string;
  name: string;
  supervisorId?: string | null;
  zoneId?: string | null;
}

export interface CreateZoneInput {
  name: string;
  code: string;
  description?: string;
}
export type UpdateZoneInput = Partial<CreateZoneInput>;

export interface CreateTeamInput {
  name: string;
  supervisorId?: string;
  zoneId?: string;
}
export type UpdateTeamInput = Partial<CreateTeamInput>;

export type Role = 'ADMIN' | 'SUPERVISOR' | 'AGENT' | 'CLIENT' | 'DIRECTION';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';
export type MfaChannel = 'EMAIL' | 'SMS';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
  status: UserStatus;
  mfaEnabled: boolean;
  mfaChannel: MfaChannel;
  clientId?: string | null;
}

export interface AgentProfileInput {
  activityType?: string;
  skills?: string[];
  zoneId?: string;
  teamId?: string;
  maxConcurrentTasks?: number;
  vehicle?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  clientId?: string;
  mfaEnabled?: boolean;
  mfaChannel?: MfaChannel;
  agentProfile?: AgentProfileInput;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password' | 'email' | 'agentProfile'>> & {
  status?: UserStatus;
};

export interface OrganizationSettings {
  timezone?: string;
  mfaRequiredRoles?: string[];
  photoRetentionDays?: number;
  trackingOnlyOnDuty?: boolean;
  locationIntervalSec?: number;
  defaultGeofenceMeters?: number;
  locationRetentionDays?: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  settings: OrganizationSettings;
}

export interface AuditLogEntry {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  success: boolean;
  createdAt: string;
}

export interface AuditQuery {
  resource?: string;
  resourceId?: string;
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export type Milestone =
  | 'PLANNED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'STARTED'
  | 'COMPLETED'
  | 'EVALUATED'
  | 'CANCELLED';

export interface WorkflowState {
  code: string;
  label: string;
  milestone?: Milestone;
  final?: boolean;
  agentVisible?: boolean;
  color?: string;
}

export type WorkflowCondition =
  | { type: 'PHOTO_REQUIRED'; photoType: string; minCount?: number; validatedOnly?: boolean; message?: string }
  | { type: 'AGENT_ASSIGNED'; message?: string }
  | { type: 'IS_ASSIGNED_AGENT'; message?: string }
  | { type: 'CHECKLIST_COMPLETE'; message?: string }
  | { type: 'COMMENT_REQUIRED'; message?: string }
  | { type: 'GEOFENCE'; radiusMeters?: number; message?: string }
  | { type: 'SIGNATURE_REQUIRED'; message?: string };

export type NotifyTarget = 'SUPERVISORS' | 'ADMINS' | 'CLIENT' | 'AGENT' | 'DIRECTION';

export type WorkflowAction =
  | { type: 'NOTIFY'; targets: NotifyTarget[]; title: string; body: string; channels?: string[] }
  | { type: 'REQUEST_EVALUATION' }
  | { type: 'UNASSIGN_AGENT' };

export interface WorkflowTransition {
  from: string | string[];
  to: string;
  label: string;
  roles: Role[];
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
}

export interface WorkflowDefinition {
  id: string;
  code: string;
  name: string;
  version: number;
  taskTypes: string[];
  isDefault: boolean;
  isActive: boolean;
  initialState: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}
