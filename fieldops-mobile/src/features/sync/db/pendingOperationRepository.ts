import { Q } from '@nozbe/watermelondb';
import { database } from '../../../lib/db/database';
import { uuid } from '../../../lib/uuid';
import { PendingOperation } from './models/PendingOperation';
import type { SyncOpPayload, SyncOpType } from '../../../lib/api/types';

const collection = () => database.collections.get<PendingOperation>('pending_operations');

export const getPendingOperations = (limit = 200) =>
  collection().query(Q.where('status', Q.oneOf(['pending', 'syncing'])), Q.sortBy('client_timestamp', Q.asc), Q.take(limit)).fetch();

export const countPending = () => collection().query(Q.where('status', 'pending')).fetchCount();

export async function getPendingTaskServerIds(): Promise<string[]> {
  const rows = await collection().query(Q.where('status', Q.oneOf(['pending', 'syncing']))).fetch();
  return [...new Set(rows.map((r) => r.taskServerId))];
}

/** Enregistre une action terrain dans la file sortante — utilisée par toutes les écritures (M3+). */
export async function enqueueOperation(
  taskServerId: string,
  type: SyncOpType,
  payload: SyncOpPayload,
): Promise<string> {
  const clientOpId = uuid();
  await database.write(async () => {
    await collection().create((record) => {
      record.clientOpId = clientOpId;
      record.type = type;
      record.taskServerId = taskServerId;
      record.clientTimestamp = new Date();
      record.payloadJson = JSON.stringify(payload);
      record.status = 'pending';
      record.errorJson = null;
      record.attempts = 0;
    });
  });
  return clientOpId;
}

export async function markApplied(op: PendingOperation): Promise<void> {
  await database.write(async () => {
    await op.update((record) => {
      record.status = 'applied';
    });
  });
}

export async function markRejected(op: PendingOperation, error: { code: string; message: string }): Promise<void> {
  await database.write(async () => {
    await op.update((record) => {
      record.status = 'rejected';
      record.errorJson = JSON.stringify(error);
    });
  });
}

export async function markRetry(op: PendingOperation): Promise<void> {
  await database.write(async () => {
    await op.update((record) => {
      record.status = 'pending';
      record.attempts += 1;
    });
  });
}
