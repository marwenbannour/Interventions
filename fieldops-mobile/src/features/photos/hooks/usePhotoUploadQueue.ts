import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { uploadQueue } from '../services/photoUploadQueue';

const PERIODIC_INTERVAL_MS = 60_000;

/** Mêmes déclencheurs que le moteur de sync (voir useSyncEngine) : premier plan, reconnexion, minuterie. */
export function usePhotoUploadQueue(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    uploadQueue.processNow();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') uploadQueue.processNow();
    });

    let wasConnected = true;
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected;
      if (isConnected && !wasConnected) uploadQueue.processNow();
      wasConnected = isConnected;
    });

    const interval = setInterval(() => uploadQueue.processNow(), PERIODIC_INTERVAL_MS);

    return () => {
      appStateSub.remove();
      unsubscribeNetInfo();
      clearInterval(interval);
    };
  }, [enabled]);
}
