'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useConnectionStore } from '@/lib/realtime/connection.store';
import { getSocket } from '@/lib/realtime/socket';

const DEBOUNCE_MS = 350;

/** Invalide le planning/la liste de tâches (debounced) sur task.event/sla.alert — jamais de merge manuel du payload. */
export function useDispatchRealtimeSync() {
  const queryClient = useQueryClient();
  const status = useConnectionStore((s) => s.status);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const invalidate = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['planning'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }, DEBOUNCE_MS);
    };

    socket.on('task.event', invalidate);
    socket.on('sla.alert', invalidate);

    return () => {
      socket.off('task.event', invalidate);
      socket.off('sla.alert', invalidate);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [status, queryClient]);
}
