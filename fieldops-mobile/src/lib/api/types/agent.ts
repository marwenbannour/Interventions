export type AgentStatus = 'PENDING_VALIDATION' | 'ACTIVE' | 'SUSPENDED';

export interface AgentProfile {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  activityType: string;
  skills: string[];
  zoneId: string | null;
  teamId: string | null;
  status: AgentStatus;
  validatedById: string | null;
  validatedAt: string | null;
  isOnDuty: boolean;
  dutyStartedAt: string | null;
  availability: Record<string, string[]>;
  maxConcurrentTasks: number;
  qualityScore: string | null;
  vehicle?: string;
}

export interface LocationPingBody {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  battery?: number | null;
  taskId?: string | null;
  recordedAt: string;
}

export interface LocationBatchRequest {
  pings: LocationPingBody[];
}

export interface LocationBatchResponse {
  accepted: number;
  intervalSec?: number;
}
