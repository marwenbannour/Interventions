import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

/** Note locale optimiste, affichée dans l'historique avant confirmation par la synchronisation. */
export class TaskNotePending extends Model {
  static table = 'task_notes_pending';

  @field('task_server_id') taskServerId: string;
  @field('text') text: string;
  @field('client_op_id') clientOpId: string;
  @readonly @date('created_at') createdAt: Date;
}
