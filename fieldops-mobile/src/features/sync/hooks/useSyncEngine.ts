import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { runSync } from '../engine/syncEngine';

const PERIODIC_INTERVAL_MS = 60_000;

/** Déclencheurs du moteur de sync : premier plan, reconnexion réseau, minuterie. */
export function useSyncEngine(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    runSync();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runSync();
    });

    let wasConnected = true;
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected;
      if (isConnected && !wasConnected) runSync();
      wasConnected = isConnected;
    });

    const interval = setInterval(() => runSync(), PERIODIC_INTERVAL_MS);

    return () => {
      appStateSub.remove();
      unsubscribeNetInfo();
      clearInterval(interval);
    };
  }, [enabled]);
}
