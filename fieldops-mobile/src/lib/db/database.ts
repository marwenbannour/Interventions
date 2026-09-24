import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Task } from '../../features/tasks/db/models/Task';
import { TaskNotePending } from '../../features/tasks/db/models/TaskNotePending';
import { PendingOperation } from '../../features/sync/db/models/PendingOperation';
import { Workflow } from '../../features/sync/db/models/Workflow';
import { SyncMeta } from '../../features/sync/db/models/SyncMeta';
import { PhotoQueueItem } from '../../features/photos/db/models/PhotoQueueItem';
import { LocationPing } from '../../features/location/db/models/LocationPing';
import { migrations } from './migrations';
import { schema } from './schema';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // jsi: false — le plugin Expo (@morrowdigital/watermelondb-expo-plugin) est configuré avec
  // disableJsi: true (voir app.config.ts) : le module natif JSI n'est pas lié, donc l'activer
  // ici ferait planter l'app. L'adaptateur par pont (bridge) reste pleinement fonctionnel.
  jsi: false,
  onSetUpError: (error) => {
    console.error('WatermelonDB — échec d’initialisation :', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Task, TaskNotePending, PendingOperation, Workflow, SyncMeta, PhotoQueueItem, LocationPing],
});

/**
 * Purge complète de la base locale — appelée à la déconnexion (les données en cache
 * sont scopées à l'agent connecté et ne doivent pas survivre sur un appareil partagé).
 */
export async function resetDatabase(): Promise<void> {
  await database.write(() => database.unsafeResetDatabase());
}
