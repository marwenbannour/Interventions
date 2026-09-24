'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/features/auth/store/session.store';
import { useConnectionStore } from './connection.store';
import { connectSocket, disconnectSocket } from './socket';

/** Gère le cycle de vie de la connexion socket en fonction de l'état de session. À monter une fois (AppShell). */
export function useRealtimeConnection() {
  const status = useSessionStore((s) => s.status);
  const setConnStatus = useConnectionStore((s) => s.setStatus);

  useEffect(() => {
    if (status !== 'authenticated') {
      disconnectSocket();
      setConnStatus('disconnected');
      return;
    }

    setConnStatus('connecting');
    const socket = connectSocket();

    const onConnect = () => setConnStatus('connected');
    const onDisconnect = () => setConnStatus('disconnected');
    const onError = () => setConnStatus('disconnected');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
      socket.off('error', onError);
    };
  }, [status, setConnStatus]);
}
