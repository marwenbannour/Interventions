import { Q } from '@nozbe/watermelondb';
import { database } from '../../../lib/db/database';
import { LocationPing } from './models/LocationPing';

const collection = () => database.collections.get<LocationPing>('location_pings');

export const getPending = (limit = 500) =>
  collection().query(Q.where('status', 'pending'), Q.sortBy('recorded_at', Q.asc), Q.take(limit)).fetch();

export async function enqueuePing(ping: {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  battery?: number | null;
  taskId?: string | null;
  recordedAt: Date;
}): Promise<void> {
  await database.write(async () => {
    await collection().create((record) => {
      record.lat = ping.lat;
      record.lng = ping.lng;
      record.accuracy = ping.accuracy ?? null;
      record.speed = ping.speed ?? null;
      record.heading = ping.heading ?? null;
      record.battery = ping.battery ?? null;
      record.taskId = ping.taskId ?? null;
      record.recordedAt = ping.recordedAt;
      record.status = 'pending';
    });
  });
}

export async function markSent(rows: LocationPing[]): Promise<void> {
  if (rows.length === 0) return;
  await database.write(async () => {
    await database.batch(
      ...rows.map((r) =>
        r.prepareUpdate((record) => {
          record.status = 'sent';
        }),
      ),
    );
  });
}

/** Purge les points déjà envoyés au-delà de 24h pour borner la taille de la table. */
export async function pruneSentOlderThan(hours = 24): Promise<void> {
  const cutoff = new Date(Date.now() - hours * 3_600_000);
  const rows = await collection()
    .query(Q.where('status', 'sent'), Q.where('recorded_at', Q.lt(cutoff.getTime())))
    .fetch();
  if (rows.length === 0) return;
  await database.write(async () => {
    await database.batch(...rows.map((r) => r.prepareDestroyPermanently()));
  });
}
