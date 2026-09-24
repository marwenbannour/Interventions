import { database } from '../../../lib/db/database';
import { enqueueOperation } from '../../sync/db/pendingOperationRepository';
import { addPendingNote } from '../db/taskNoteRepository';
import { runSync } from '../../sync/engine/syncEngine';
import type { Task as TaskModel } from '../db/models/Task';
import type { ChecklistItem, ChecklistUpdateRequest, NoteRequest, TransitionRequest } from '../../../lib/api/types';

/**
 * Écriture optimiste locale (visible immédiatement, sans attendre le réseau) + mise
 * en file dans pending_operations + tentative de sync immédiate best-effort.
 * Le serveur reste seul autoritaire : un pull ultérieur peut corriger cet état local
 * (voir syncEngine.ts — le pull écrase toujours avec le snapshot serveur).
 */

export async function submitTransition(task: TaskModel, body: TransitionRequest): Promise<void> {
  await database.write(async () => {
    await task.update((record) => {
      record.status = body.to;
      record.localStatus = 'pending';
    });
  });
  await enqueueOperation(task.serverId, 'TASK_TRANSITION', body);
  runSync();
}

export async function submitChecklistUpdate(
  task: TaskModel,
  items: { id: string; done: boolean; value?: string }[],
): Promise<void> {
  const merged: ChecklistItem[] = task.checklist.map((existing) => {
    const change = items.find((i) => i.id === existing.id);
    if (!change) return existing;
    return {
      ...existing,
      done: change.done,
      value: change.value ?? existing.value,
      doneAt: change.done ? new Date().toISOString() : null,
    };
  });
  await database.write(async () => {
    await task.update((record) => {
      record.checklist = merged;
      record.localStatus = 'pending';
    });
  });
  const body: ChecklistUpdateRequest = { items };
  await enqueueOperation(task.serverId, 'CHECKLIST_UPDATE', body);
  runSync();
}

export async function submitNote(task: TaskModel, text: string): Promise<void> {
  const body: NoteRequest = { text };
  const clientOpId = await enqueueOperation(task.serverId, 'TASK_NOTE', body);
  await addPendingNote(task.serverId, text, clientOpId);
  runSync();
}
