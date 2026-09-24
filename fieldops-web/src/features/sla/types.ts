import type { SiteSnapshot, TaskPriority } from '../dispatch/types';

export interface SlaPolicy {
  id: string;
  name: string;
  clientId: string | null;
  siteId: string | null;
  taskType: string | null;
  priority: TaskPriority | null;
  acknowledgeMinutes: number | null;
  arrivalMinutes: number | null;
  interventionMinutes: number | null;
  closureMinutes: number | null;
  warningMinutesBefore: number;
  isActive: boolean;
}

export interface CreateSlaPolicyInput {
  name: string;
  clientId?: string;
  siteId?: string;
  taskType?: string;
  priority?: TaskPriority;
  acknowledgeMinutes?: number;
  arrivalMinutes?: number;
  interventionMinutes?: number;
  closureMinutes?: number;
  warningMinutesBefore?: number;
}

export interface UpdateSlaPolicyInput extends Partial<CreateSlaPolicyInput> {
  isActive?: boolean;
}

/** GET /sla/at-risk — entités Task brutes avec site+agent joints (pas de client). */
export interface SlaAtRiskTask {
  id: string;
  reference: string;
  title: string;
  status: string;
  priority: TaskPriority;
  site: SiteSnapshot | null;
  agent: { id: string; firstName: string; lastName: string } | null;
  ackDueAt: string | null;
  arrivalDueAt: string | null;
  interventionDueAt: string | null;
  closeDueAt: string | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  ackBreached: boolean;
  arrivalBreached: boolean;
  interventionBreached: boolean;
  closeBreached: boolean;
}
