'use client';

import { useEffect, useRef } from 'react';
import { authApi } from '../api/auth.api';
import { usersApi } from '../api/users.api';
import { useSessionStore } from '../store/session.store';

/** Au premier chargement de l'app, tente de reconstituer la session à partir du cookie de refresh httpOnly. */
export function useSilentRefresh() {
  const setSession = useSessionStore((s) => s.setSession);
  const setAccessToken = useSessionStore((s) => s.setAccessToken);
  const clearSession = useSessionStore((s) => s.clearSession);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    authApi
      .refresh()
      .then(async ({ accessToken }) => {
        setAccessToken(accessToken);
        const user = await usersApi.me();
        setSession(accessToken, user);
      })
      .catch(() => clearSession());
  }, [setSession, setAccessToken, clearSession]);
}
