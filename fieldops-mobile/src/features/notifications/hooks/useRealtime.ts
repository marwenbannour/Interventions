import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { connectSocket, disconnectSocket } from '../../../lib/realtime/socket';
import { useSessionStore } from '../../auth/store/session.store';
import { runSync } from '../../sync/engine/syncEngine';
import { NOTIFICATIONS_QUERY_KEY } from './useNotifications';

const DEBOUNCE_MS = 2_000;
const BUSINESS_EVENTS = ['task.event', 'sla.alert', 'photo.added', 'evaluation.created'] as const;

/**
 * Connecte le socket /realtime uniquement si authentifié + app au premier plan.
 * Les événements métier déclenchent un pull (débouncé) plutôt que d'écrire
 * directement en base — une seule logique d'application des données (voir syncEngine).
 */
export function useRealtime(enabled: boolean): void {
  const accessToken = useSessionStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !accessToken) return;

    const debouncedSync = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => runSync(), DEBOUNCE_MS);
    };

    const attach = () => {
      const socket = connectSocket(accessToken);
      BUSINESS_EVENTS.forEach((event) => socket.on(event, debouncedSync));
      socket.on('notification', () => {
        queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      });
    };

    let appState: AppStateStatus = AppState.currentState;
    if (appState === 'active') attach();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && appState !== 'active') attach();
      if (next !== 'active' && appState === 'active') disconnectSocket();
      appState = next;
    });

    return () => {
      sub.remove();
      disconnectSocket();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [enabled, accessToken, queryClient]);
}
