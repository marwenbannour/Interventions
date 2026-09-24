import { Q } from '@nozbe/watermelondb';
import { database } from '../../../lib/db/database';
import { Task as TaskModel } from './models/Task';
import type { Task as ApiTask, TaskSnapshot } from '../../../lib/api/types';

const collection = () => database.collections.get<TaskModel>('tasks');

function applyApiTask(record: TaskModel, t: ApiTask) {
  record.serverId = t.id;
  record.reference = t.reference;
  record.title = t.title;
  record.description = t.description ?? null;
  record.type = t.type;
  record.priority = t.priority;
  record.status = t.status;
  record.workflowId = t.workflowId;
  record.clientId = t.clientId;
  record.client = t.client;
  record.siteId = t.siteId;
  record.site = t.site;
  record.agentId = t.agentId ?? null;
  record.checklist = t.checklist;
  record.scheduledStart = t.scheduledStart ? new Date(t.scheduledStart) : null;
  record.scheduledEnd = t.scheduledEnd ? new Date(t.scheduledEnd) : null;
  record.milestones = {
    plannedAt: t.plannedAt,
    assignedAt: t.assignedAt,
    acceptedAt: t.acceptedAt,
    enRouteAt: t.enRouteAt,
    arrivedAt: t.arrivedAt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    evaluatedAt: t.evaluatedAt,
    cancelledAt: t.cancelledAt,
  };
  record.sla = {
    slaPolicyId: t.slaPolicyId,
    ackDueAt: t.ackDueAt,
    arrivalDueAt: t.arrivalDueAt,
    interventionDueAt: t.interventionDueAt,
    closeDueAt: t.closeDueAt,
    ackBreached: t.ackBreached,
    arrivalBreached: t.arrivalBreached,
    interventionBreached: t.interventionBreached,
    closeBreached: t.closeBreached,
    slaAlertsSent: t.slaAlertsSent,
  };
  record.completionNotes = t.completionNotes ?? null;
  record.signatureKey = t.signatureKey ?? null;
  record.signedByName = t.signedByName ?? null;
  record.version = t.version;
  record.serverUpdatedAt = new Date(t.updatedAt);
  record.localStatus = 'synced';
}

/** Upsert par lot (clé de correspondance : server_id) — le serveur fait toujours foi. */
export async function upsertTasks(tasks: ApiTask[]): Promise<void> {
  if (tasks.length === 0) return;
  await database.write(async () => {
    const operations = await Promise.all(
      tasks.map(async (t) => {
        const existing = await collection().query(Q.where('server_id', t.id)).fetch();
        if (existing.length > 0) {
          return existing[0].prepareUpdate((record) => applyApiTask(record, t));
        }
        return collection().prepareCreate((record) => applyApiTask(record, t));
      }),
    );
    await database.batch(...operations);
  });
}

export async function deleteTasksByServerIds(serverIds: string[]): Promise<void> {
  if (serverIds.length === 0) return;
  const rows = await collection().query(Q.where('server_id', Q.oneOf(serverIds))).fetch();
  if (rows.length === 0) return;
  await database.write(async () => {
    await database.batch(...rows.map((r) => r.prepareDestroyPermanently()));
  });
}

/**
 * Ré-applique le flag "pending" après un pull qui aurait écrasé local_status='synced'
 * sur une tâche dont une opération est encore en file (ex : rejet réseau retenté au
 * prochain cycle). Le pull reste autoritaire sur `status`/`checklist`, pas sur ce flag UI.
 */
export async function markTasksPendingByServerIds(serverIds: string[]): Promise<void> {
  if (serverIds.length === 0) return;
  const rows = await collection().query(Q.where('server_id', Q.oneOf(serverIds))).fetch();
  if (rows.length === 0) return;
  await database.write(async () => {
    await database.batch(
      ...rows.map((r) =>
        r.prepareUpdate((record) => {
          record.localStatus = 'pending';
        }),
      ),
    );
  });
}

/** Applique le snapshot serveur reçu d'un résultat de /sync/push (APPLIED/DUPLICATE). */
export async function applyTaskSnapshot(snapshot: TaskSnapshot): Promise<void> {
  const existing = await collection().query(Q.where('server_id', snapshot.id)).fetch();
  if (existing.length === 0) return;
  await database.write(async () => {
    await existing[0].update((record) => {
      record.status = snapshot.status;
      record.agentId = snapshot.agentId;
      record.checklist = snapshot.checklist;
      record.version = snapshot.version;
      record.serverUpdatedAt = new Date(snapshot.updatedAt);
      record.localStatus = 'synced';
    });
  });
}
