import { Q } from '@nozbe/watermelondb';
import { database } from '../../../lib/db/database';
import { uuid } from '../../../lib/uuid';
import { SyncMeta } from './models/SyncMeta';

const collection = () => database.collections.get<SyncMeta>('sync_meta');

export async function getMeta(key: string): Promise<string | null> {
  const rows = await collection().query(Q.where('key', key)).fetch();
  return rows[0]?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await database.write(async () => {
    const rows = await collection().query(Q.where('key', key)).fetch();
    if (rows.length > 0) {
      await rows[0].update((record) => {
        record.value = value;
      });
    } else {
      await collection().create((record) => {
        record.key = key;
        record.value = value;
      });
    }
  });
}

const DEVICE_ID_KEY = 'deviceId';
const SERVER_TIME_KEY = 'serverTime';
const SETTINGS_KEY = 'syncSettings';

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getMeta(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = uuid();
  await setMeta(DEVICE_ID_KEY, id);
  return id;
}

export const getServerTime = () => getMeta(SERVER_TIME_KEY);
export const setServerTime = (value: string) => setMeta(SERVER_TIME_KEY, value);
export const getSyncSettingsRaw = () => getMeta(SETTINGS_KEY);
export const setSyncSettingsRaw = (value: string) => setMeta(SETTINGS_KEY, value);
