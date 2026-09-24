import { useEffect } from 'react';
import { secureStorage } from '../../../lib/secureStorage';
import { authApi } from '../api/auth.api';
import { useSessionStore } from '../store/session.store';

/**
 * Au lancement de l'app : tente un refresh silencieux depuis le refreshToken persisté.
 * Réussite -> session authentifiée (après récupération de /users/me, le refresh
 * ne renvoie pas l'utilisateur). Échec ou absence de token -> non authentifié.
 */
export function useSilentRefresh(): void {
  const setSession = useSessionStore((s) => s.setSession);
  const setAccessToken = useSessionStore((s) => s.setAccessToken);
  const clearSession = useSessionStore((s) => s.clearSession);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const refreshToken = await secureStorage.getRefreshToken();
      if (!refreshToken) {
        if (!cancelled) clearSession();
        return;
      }
      try {
        const pair = await authApi.refresh({ refreshToken });
        await secureStorage.setRefreshToken(pair.refreshToken);
        if (cancelled) return;
        setAccessToken(pair.accessToken);
        const user = await authApi.me();
        if (cancelled) return;
        setSession(pair.accessToken, user);
      } catch {
        await secureStorage.clearRefreshToken().catch(() => undefined);
        if (!cancelled) clearSession();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
