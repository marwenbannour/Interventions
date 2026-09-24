import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { enqueuePing } from '../db/locationPingRepository';

export const LOCATION_TASK_NAME = 'fieldops-background-location';

/**
 * Défini au niveau module — doit être enregistré avant tout appel à
 * startLocationUpdatesAsync, et survit aux redémarrages de l'app en arrière-plan.
 * N'appelle jamais le réseau ici : seule l'écriture locale est fiable en tâche de fond
 * (voir locationFlush.ts pour l'envoi par lots).
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (locations.length === 0) return;

  const battery = await Battery.getBatteryLevelAsync().catch(() => null);
  const batteryPercent = battery != null && battery >= 0 ? Math.round(battery * 100) : null;

  for (const loc of locations) {
    await enqueuePing({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      speed: loc.coords.speed,
      heading: loc.coords.heading,
      battery: batteryPercent,
      recordedAt: new Date(loc.timestamp),
    });
  }
});

export async function startBackgroundLocation(intervalSec: number): Promise<boolean> {
  const already = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  const running = already && (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME));
  if (running) return true;

  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return false;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: intervalSec * 1000,
    distanceInterval: 25,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'FieldOps',
      notificationBody: 'Suivi de position actif pendant le service',
    },
  });
  return true;
}

export async function stopBackgroundLocation(): Promise<void> {
  const running = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (!running) return;
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}
