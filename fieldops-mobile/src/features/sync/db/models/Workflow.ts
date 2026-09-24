import { Model } from '@nozbe/watermelondb';
import { date, field, json } from '@nozbe/watermelondb/decorators';
import type { WorkflowDefinitionData } from '../../../../lib/api/types';

const sanitizeObject = (raw: unknown) => (raw && typeof raw === 'object' ? raw : {});

/** Cache local des WorkflowDefinition reçues via /sync/pull — nécessaire à workflowEngine.ts hors-ligne. */
export class Workflow extends Model {
  static table = 'workflows';

  @field('server_id') serverId: string;
  @json('definition_json', sanitizeObject) definition: WorkflowDefinitionData;
  @date('updated_at') updatedAt: Date;
}
