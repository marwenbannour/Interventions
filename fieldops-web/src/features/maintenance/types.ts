import type { AssetSnapshot, SiteSnapshot, TaskPriority } from '../dispatch/types';

export type MaintenanceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface MaintenancePlan {
  id: string;
  name: string;
  clientId: string;
  siteId: string;
  site?: SiteSnapshot;
  assetId: string | null;
  asset?: AssetSnapshot | null;
  taskType: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  requiredSkills: string[];
  checklist: { label: string; required?: boolean }[];
  estimatedDurationMin: number | null;
  defaultAgentId: string | null;
  frequency: MaintenanceFrequency;
  interval: number;
  startAt: string;
  endAt: string | null;
  leadTimeDays: number;
  occurrenceIndex: number;
  nextDueAt: string | null;
  isActive: boolean;
  generatedCount: number;
  lastGeneratedAt: string | null;
  lastTaskId: string | null;
}

export interface MaintenancePlanInput {
  name: string;
  siteId: string;
  assetId?: string;
  taskType: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  requiredSkills?: string[];
  checklist?: { label: string; required?: boolean }[];
  estimatedDurationMin?: number;
  frequency: MaintenanceFrequency;
  interval?: number;
  startAt: string;
  endAt?: string;
  leadTimeDays?: number;
}

export type UpdateMaintenancePlanInput = Partial<Omit<MaintenancePlanInput, 'siteId'>> & { isActive?: boolean };

export interface GenerationResult {
  planId: string;
  taskId?: string;
  reference?: string;
  dueAt: string;
  status: 'CREATED' | 'ALREADY_EXISTS' | 'FAILED';
  error?: string;
}
