import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';
import type { SyncOpPayload, SyncOpType } from '../../../../lib/api/types';

export type PendingOperationStatus = 'pending' | 'syncing' | 'applied' | 'rejected';

/** File d'attente sortante — miroir local de SyncOperationDto (POST /sync/push). */
export class PendingOperation extends Model {
  static table = 'pending_operations';

  @field('client_op_id') clientOpId: string;
  @field('type') type: SyncOpType;
  @field('task_server_id') taskServerId: string;
  @date('client_timestamp') clientTimestamp: Date;
  @field('payload_json') payloadJson: string;
  @field('status') status: PendingOperationStatus;
  @field('error_json') errorJson: string | null;
  @field('attempts') attempts: number;
  @readonly @date('created_at') createdAt: Date;

  get payload(): SyncOpPayload {
    return JSON.parse(this.payloadJson) as SyncOpPayload;
  }
}
