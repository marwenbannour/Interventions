import NetInfo from '@react-native-community/netinfo';
import { syncApi } from '../api/sync.api';
import { useSyncStatusStore } from '../store/syncStatus.store';
import {
  countPending,
  getPendingOperations,
  getPendingTaskServerIds,
  markApplied,
  markRejected,
  markRetry,
} from '../db/pendingOperationRepository';
import { upsertWorkflows } from '../db/workflowRepository';
import { getOrCreateDeviceId, getServerTime, setServerTime, setSyncSettingsRaw } from '../db/syncMetaRepository';
import {
  applyTaskSnapshot,
  deleteTasksByServerIds,
  markTasksPendingByServerIds,
  upsertTasks,
} from '../../tasks/db/taskRepository';
import { deletePendingNoteByClientOpId } from '../../tasks/db/taskNoteRepository';

let running: Promise<void> | null = null;

/** Point d'entrée unique du moteur de sync — mutex pour éviter les exécutions concurrentes. */
export function runSync(): Promise<void> {
  if (!running) {
    running = execute().finally(() => {
      running = null;
    });
  }
  return running;
}

async function execute(): Promise<void> {
  const { set } = useSyncStatusStore.getState();
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    set({ phase: 'offline' });
    return;
  }
  set({ phase: 'syncing' });
  try {
    await pushPhase();
    await pullPhase();
    const pendingOpsCount = await countPending();
    set({ phase: 'idle', lastSyncedAt: new Date().toISOString(), lastError: null, pendingOpsCount });
  } catch (error) {
    set({ phase: 'error', lastError: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Une erreur métier (transition refusée, etc.) est définitive — pas de retry auto.
 * Une erreur sans code (ex : réseau coupé en cours de lot) reste "pending" pour le prochain cycle.
 */
async function pushPhase(): Promise<void> {
  const ops = await getPendingOperations();
  if (ops.length === 0) return;

  const deviceId = await getOrCreateDeviceId();
  const response = await syncApi.push({
    deviceId,
    operations: ops.map((op) => ({
      clientOpId: op.clientOpId,
      type: op.type,
      taskId: op.taskServerId,
      clientTimestamp: op.clientTimestamp.toISOString(),
      payload: op.payload,
    })),
  });

  const byClientOpId = new Map(ops.map((op) => [op.clientOpId, op]));
  for (const result of response.results) {
    const op = byClientOpId.get(result.clientOpId);
    if (!op) continue;

    if (result.status === 'APPLIED' || result.status === 'DUPLICATE') {
      await markApplied(op);
      if (result.task) await applyTaskSnapshot(result.task);
      await deletePendingNoteByClientOpId(op.clientOpId);
    } else if (result.error) {
      await markRejected(op, result.error);
    } else {
      await markRetry(op);
    }
  }
}

async function pullPhase(): Promise<void> {
  const since = await getServerTime();
  const response = await syncApi.pull(since ?? undefined);
  await upsertWorkflows(response.workflows);
  await upsertTasks(response.tasks);
  await deleteTasksByServerIds(response.removedTaskIds);
  await setServerTime(response.serverTime);
  await setSyncSettingsRaw(JSON.stringify(response.settings));

  const outstanding = await getPendingTaskServerIds();
  await markTasksPendingByServerIds(outstanding);
}
