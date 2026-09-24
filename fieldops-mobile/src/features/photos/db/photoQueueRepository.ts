import { Q } from '@nozbe/watermelondb';
import { database } from '../../../lib/db/database';
import { uuid } from '../../../lib/uuid';
import { PhotoQueueItem } from './models/PhotoQueueItem';
import type { PhotoType } from '../../../lib/api/types';

const collection = () => database.collections.get<PhotoQueueItem>('photos_queue');

export const observePhotosForTask = (taskServerId: string) =>
  collection().query(Q.where('task_server_id', taskServerId), Q.sortBy('created_at', Q.asc)).observe();

export const getUploadable = (limit = 20) =>
  collection().query(Q.where('status', Q.oneOf(['pending', 'failed'])), Q.take(limit)).fetch();

/** Compte local (en attente + en cours + déjà envoyées) par type, pour fusionner avec photoCounts serveur. */
export async function countLocalByType(taskServerId: string): Promise<Partial<Record<PhotoType, number>>> {
  const rows = await collection().query(Q.where('task_server_id', taskServerId)).fetch();
  const counts: Partial<Record<PhotoType, number>> = {};
  for (const row of rows) {
    counts[row.type] = (counts[row.type] ?? 0) + 1;
  }
  return counts;
}

interface EnqueuePhotoParams {
  taskServerId: string;
  localUri: string;
  type: PhotoType;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  caption?: string | null;
  signedByName?: string | null;
}

export async function enqueuePhoto(params: EnqueuePhotoParams): Promise<string> {
  const clientPhotoId = uuid();
  await database.write(async () => {
    await collection().create((record) => {
      record.localUri = params.localUri;
      record.clientPhotoId = clientPhotoId;
      record.taskServerId = params.taskServerId;
      record.type = params.type;
      record.lat = params.lat ?? null;
      record.lng = params.lng ?? null;
      record.accuracy = params.accuracy ?? null;
      record.takenAt = new Date();
      record.caption = params.caption ?? null;
      record.signedByName = params.signedByName ?? null;
      record.status = 'pending';
      record.attempts = 0;
      record.error = null;
      record.serverPhotoId = null;
    });
  });
  return clientPhotoId;
}

export async function markUploading(item: PhotoQueueItem): Promise<void> {
  await database.write(async () => {
    await item.update((record) => {
      record.status = 'uploading';
    });
  });
}

export async function markUploaded(item: PhotoQueueItem, serverPhotoId: string): Promise<void> {
  await database.write(async () => {
    await item.update((record) => {
      record.status = 'uploaded';
      record.serverPhotoId = serverPhotoId;
      record.error = null;
    });
  });
}

export async function markFailed(item: PhotoQueueItem, error: string): Promise<void> {
  await database.write(async () => {
    await item.update((record) => {
      record.status = 'failed';
      record.attempts += 1;
      record.error = error;
    });
  });
}
