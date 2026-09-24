import NetInfo from '@react-native-community/netinfo';
import { locationApi } from '../api/location.api';
import { getPending, markSent, pruneSentOlderThan } from '../db/locationPingRepository';

let running: Promise<void> | null = null;

async function execute(): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;
  const pending = await getPending();
  if (pending.length === 0) {
    await pruneSentOlderThan();
    return;
  }
  try {
    await locationApi.sendBatch({
      pings: pending.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        accuracy: p.accuracy,
        speed: p.speed,
        heading: p.heading,
        battery: p.battery,
        taskId: p.taskId,
        recordedAt: p.recordedAt.toISOString(),
      })),
    });
    await markSent(pending);
    await pruneSentOlderThan();
  } catch {
    // Réseau ou erreur serveur — les points restent "pending" pour le prochain cycle.
  }
}

export const locationFlush = {
  processNow(): Promise<void> {
    if (!running) {
      running = execute().finally(() => {
        running = null;
      });
    }
    return running;
  },
};
