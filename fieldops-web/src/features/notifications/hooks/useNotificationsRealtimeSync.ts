'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useConnectionStore } from '@/lib/realtime/connection.store';
import { getSocket } from '@/lib/realtime/socket';
import { NOTIFICATIONS_QUERY_KEY } from './useNotifications';

/** `notification` est envoyé uniquement à user:{userId} (jamais à la room ops) : invalidation immédiate, pas de debounce nécessaire. */
export function useNotificationsRealtimeSync() {
  const queryClient = useQueryClient();
  const status = useConnectionStore((s) => s.status);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

    socket.on('notification', invalidate);
    return () => {
      socket.off('notification', invalidate);
    };
  }, [status, queryClient]);
}
