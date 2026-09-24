import { Q } from '@nozbe/watermelondb';
import { database } from '../../../lib/db/database';
import { Workflow as WorkflowModel } from './models/Workflow';
import type { WorkflowDefinition } from '../../../lib/api/types';

const collection = () => database.collections.get<WorkflowModel>('workflows');

export async function upsertWorkflows(workflows: WorkflowDefinition[]): Promise<void> {
  if (workflows.length === 0) return;
  await database.write(async () => {
    const operations = await Promise.all(
      workflows.map(async (w) => {
        const existing = await collection().query(Q.where('server_id', w.id)).fetch();
        const apply = (record: WorkflowModel) => {
          record.serverId = w.id;
          record.definition = { initialState: w.initialState, states: w.states, transitions: w.transitions };
          record.updatedAt = new Date();
        };
        return existing.length > 0 ? existing[0].prepareUpdate(apply) : collection().prepareCreate(apply);
      }),
    );
    await database.batch(...operations);
  });
}

export async function getWorkflow(serverId: string): Promise<WorkflowModel | undefined> {
  const rows = await collection().query(Q.where('server_id', serverId)).fetch();
  return rows[0];
}
