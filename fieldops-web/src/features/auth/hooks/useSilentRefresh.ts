'use client';

import { useEffect, useRef } from 'react';
import { refreshAccessToken } from '@/lib/api/client';
import { usersApi } from '../api/users.api';
import { useSessionStore } from '../store/session.store';

/** Au premier chargement de l'app, tente de reconstituer la session à partir du cookie de refresh httpOnly. */
export function useSilentRefresh() {
  const setSession = useSessionStore((s) => s.setSession);
  const clearSession = useSessionStore((s) => s.clearSession);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Même verrou que les rafraîchissements déclenchés par un 401 (voir client.ts).
    refreshAccessToken()
      .then(async (accessToken) => {
        if (!accessToken) return clearSession();
        const user = await usersApi.me();
        setSession(accessToken, user);
      })
      .catch(() => clearSession());
  }, [setSession, clearSession]);
}
