'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useConnectionStore } from '@/lib/realtime/connection.store';
import { getSocket } from '@/lib/realtime/socket';

const DEBOUNCE_MS = 800;

/** Invalide la position live (agent.location) et le statut de service (task.event) — jamais de merge manuel. */
export function useAgentsRealtimeSync() {
  const queryClient = useQueryClient();
  const status = useConnectionStore((s) => s.status);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const invalidatePositions = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['agents-live'] });
      }, DEBOUNCE_MS);
    };
    const invalidateRoster = () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    };

    socket.on('agent.location', invalidatePositions);
    socket.on('task.event', invalidateRoster);

    return () => {
      socket.off('agent.location', invalidatePositions);
      socket.off('task.event', invalidateRoster);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [status, queryClient]);
}
