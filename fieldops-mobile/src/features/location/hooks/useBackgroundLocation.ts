import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDutyStore } from '../../agents/store/duty.store';
import { getSyncSettingsRaw } from '../../sync/db/syncMetaRepository';
import { startBackgroundLocation, stopBackgroundLocation } from '../services/backgroundLocation';
import { locationFlush } from '../services/locationFlush';
import type { SyncSettings } from '../../../lib/api/types';

const DEFAULT_INTERVAL_SEC = 30;
const PERIODIC_FLUSH_MS = 60_000;

async function readSyncSettings(): Promise<SyncSettings> {
  const raw = await getSyncSettingsRaw();
  if (!raw) return { locationIntervalSec: DEFAULT_INTERVAL_SEC, trackingOnlyOnDuty: true, defaultGeofenceMeters: 300 };
  return JSON.parse(raw) as SyncSettings;
}

/**
 * Démarre/arrête le suivi GPS en arrière-plan selon l'état de service et le réglage
 * organisation `trackingOnlyOnDuty` (synchronisé via /sync/pull). Anime aussi le flush
 * périodique de la file locale vers POST /agents/me/location (mêmes déclencheurs que
 * les autres moteurs : premier plan, reconnexion, minuterie).
 */
export function useBackgroundLocation(enabled: boolean): void {
  const isOnDuty = useDutyStore((s) => s.isOnDuty);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      stopBackgroundLocation();
      return;
    }
    (async () => {
      const settings = await readSyncSettings();
      if (cancelled) return;
      const shouldTrack = settings.trackingOnlyOnDuty ? isOnDuty : true;
      if (shouldTrack) await startBackgroundLocation(settings.locationIntervalSec);
      else await stopBackgroundLocation();
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, isOnDuty]);

  useEffect(() => {
    if (!enabled) return;

    locationFlush.processNow();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') locationFlush.processNow();
    });

    let wasConnected = true;
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected;
      if (isConnected && !wasConnected) locationFlush.processNow();
      wasConnected = isConnected;
    });

    const interval = setInterval(() => locationFlush.processNow(), PERIODIC_FLUSH_MS);

    return () => {
      appStateSub.remove();
      unsubscribeNetInfo();
      clearInterval(interval);
    };
  }, [enabled]);
}
