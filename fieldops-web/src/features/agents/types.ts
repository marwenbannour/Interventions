export type AgentStatus = 'PENDING_VALIDATION' | 'ACTIVE' | 'SUSPENDED';

export interface AgentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface AgentListItem {
  id: string;
  userId: string;
  user: AgentUser;
  activityType: string;
  skills: string[];
  zoneId: string | null;
  teamId: string | null;
  status: AgentStatus;
  isOnDuty: boolean;
  dutyStartedAt: string | null;
  maxConcurrentTasks: number;
  /** Colonne decimal Postgres — sérialisée en chaîne par TypeORM, jamais un number. */
  qualityScore: string | null;
  vehicle?: string | null;
  activeTasks: number;
}

export interface LivePosition {
  agentId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  battery?: number | null;
  taskId?: string | null;
  recordedAt: string;
  stale: boolean;
}

export interface LocationHistoryPoint {
  recordedAt: string;
  accuracy: number | null;
  speed: number | null;
  taskId: string | null;
  lat: number;
  lng: number;
}

export interface LocationHistory {
  points: LocationHistoryPoint[];
  distanceKm: number;
}
