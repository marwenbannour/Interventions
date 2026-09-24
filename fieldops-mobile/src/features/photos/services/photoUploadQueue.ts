import NetInfo from '@react-native-community/netinfo';
import { File } from 'expo-file-system';
import { photosApi } from '../api/photos.api';
import { getUploadable, markFailed, markUploaded, markUploading } from '../db/photoQueueRepository';
import type { PhotoQueueItem } from '../db/models/PhotoQueueItem';

const CONCURRENCY = 2;

async function uploadOne(item: PhotoQueueItem): Promise<void> {
  await markUploading(item);
  try {
    const response = await photosApi.upload({
      taskId: item.taskServerId,
      fileUri: item.localUri,
      fileName: item.localUri.split('/').pop() ?? 'photo.jpg',
      mimeType: 'image/jpeg',
      type: item.type,
      clientPhotoId: item.clientPhotoId,
      lat: item.lat,
      lng: item.lng,
      accuracy: item.accuracy,
      takenAt: item.takenAt.toISOString(),
      caption: item.caption,
      signedByName: item.signedByName,
    });
    // Toute réponse 2xx (y compris duplicate:true) vaut confirmation — l'idempotence
    // par clientPhotoId est gérée côté serveur.
    await markUploaded(item, response.id);
    try {
      new File(item.localUri).delete();
    } catch {
      // Fichier déjà absent ou verrouillé — sans conséquence, il ne sera plus référencé.
    }
  } catch (error) {
    await markFailed(item, error instanceof Error ? error.message : String(error));
  }
}

let running: Promise<void> | null = null;

async function execute(): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;
  const queue = await getUploadable();
  if (queue.length === 0) return;

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    let item = queue.shift();
    while (item) {
      await uploadOne(item);
      item = queue.shift();
    }
  });
  await Promise.all(workers);
}

export const uploadQueue = {
  /** Idempotent — dédupliqué si déjà en cours. */
  processNow(): Promise<void> {
    if (!running) {
      running = execute().finally(() => {
        running = null;
      });
    }
    return running;
  },
};
