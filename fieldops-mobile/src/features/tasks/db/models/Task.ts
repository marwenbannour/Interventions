import { Model } from '@nozbe/watermelondb';
import { date, field, json, readonly } from '@nozbe/watermelondb/decorators';
import type {
  ChecklistItem,
  ClientSnapshot,
  MilestoneTimestamps,
  PhotoCounts,
  SiteSnapshot,
  SlaSnapshot,
  TaskPriority,
} from '../../../../lib/api/types';

const sanitizeArray = (raw: unknown) => (Array.isArray(raw) ? raw : []);
const sanitizeObject = (raw: unknown) => (raw && typeof raw === 'object' ? raw : {});

export type LocalTaskStatus = 'synced' | 'pending';

export class Task extends Model {
  static table = 'tasks';

  @field('server_id') serverId: string;
  @field('reference') reference: string;
  @field('title') title: string;
  @field('description') description: string | null;
  @field('type') type: string;
  @field('priority') priority: TaskPriority;
  @field('status') status: string;
  @field('workflow_id') workflowId: string;
  @field('client_id') clientId: string;
  @json('client_json', sanitizeObject) client: ClientSnapshot;
  @field('site_id') siteId: string;
  @json('site_json', sanitizeObject) site: SiteSnapshot;
  @field('agent_id') agentId: string | null;
  @json('checklist_json', sanitizeArray) checklist: ChecklistItem[];
  @date('scheduled_start') scheduledStart: Date | null;
  @date('scheduled_end') scheduledEnd: Date | null;
  @json('milestones_json', sanitizeObject) milestones: MilestoneTimestamps;
  @json('sla_json', sanitizeObject) sla: SlaSnapshot;
  @field('completion_notes') completionNotes: string | null;
  @field('signature_key') signatureKey: string | null;
  @field('signed_by_name') signedByName: string | null;
  @json('photo_counts_json', sanitizeObject) photoCounts: PhotoCounts;
  @field('version') version: number;
  @date('server_updated_at') serverUpdatedAt: Date;
  @field('local_status') localStatus: LocalTaskStatus;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
