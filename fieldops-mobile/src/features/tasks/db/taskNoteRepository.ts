import { Q } from '@nozbe/watermelondb';
import { database } from '../../../lib/db/database';
import { TaskNotePending } from './models/TaskNotePending';

const collection = () => database.collections.get<TaskNotePending>('task_notes_pending');

export const observePendingNotes = (taskServerId: string) =>
  collection().query(Q.where('task_server_id', taskServerId), Q.sortBy('created_at', Q.asc)).observe();

export async function addPendingNote(taskServerId: string, text: string, clientOpId: string): Promise<void> {
  await database.write(async () => {
    await collection().create((record) => {
      record.taskServerId = taskServerId;
      record.text = text;
      record.clientOpId = clientOpId;
    });
  });
}

export async function deletePendingNoteByClientOpId(clientOpId: string): Promise<void> {
  const rows = await collection().query(Q.where('client_op_id', clientOpId)).fetch();
  if (rows.length === 0) return;
  await database.write(async () => {
    await database.batch(...rows.map((r) => r.prepareDestroyPermanently()));
  });
}
