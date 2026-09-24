import type { ChecklistUpdateRequest, NoteRequest, Task, TransitionRequest, WorkflowDefinition } from './task';

export type SyncOpType = 'TASK_TRANSITION' | 'CHECKLIST_UPDATE' | 'TASK_NOTE';

export type SyncOpPayload = TransitionRequest | ChecklistUpdateRequest | NoteRequest;

export interface SyncOperation {
  clientOpId: string;
  type: SyncOpType;
  taskId: string;
  clientTimestamp: string;
  payload: SyncOpPayload;
}

export interface SyncPushRequest {
  deviceId?: string;
  operations: SyncOperation[];
}

export type SyncResultStatus = 'APPLIED' | 'DUPLICATE' | 'REJECTED';

export interface TaskSnapshot {
  id: string;
  status: string;
  agentId: string | null;
  checklist: Task['checklist'];
  version: number;
  updatedAt: string;
}

export interface SyncOpResult {
  clientOpId: string;
  status: SyncResultStatus;
  error?: { code: string; message: string; details?: unknown };
  task?: TaskSnapshot | null;
}

export interface SyncPushResponse {
  serverTime: string;
  results: SyncOpResult[];
}

export interface SyncSettings {
  locationIntervalSec: number;
  trackingOnlyOnDuty: boolean;
  defaultGeofenceMeters: number;
}

export interface SyncPullResponse {
  serverTime: string;
  full: boolean;
  tasks: Task[];
  removedTaskIds: string[];
  workflows: WorkflowDefinition[];
  settings: SyncSettings;
}
