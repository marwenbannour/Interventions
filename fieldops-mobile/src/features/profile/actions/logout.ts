import { secureStorage } from '../../../lib/secureStorage';
import { resetDatabase } from '../../../lib/db/database';
import { disconnectSocket } from '../../../lib/realtime/socket';
import { authApi } from '../../auth/api/auth.api';
import { useSessionStore } from '../../auth/store/session.store';
import { stopBackgroundLocation } from '../../location/services/backgroundLocation';
import { unregisterPushToken } from '../../notifications/services/pushRegistration';

/**
 * Déconnexion : révocation côté serveur (cet appareil ou tous), puis nettoyage local complet
 * (suivi GPS, push, temps réel, jeton, base hors-ligne).
 */
export async function logout(allDevices: boolean): Promise<void> {
  try {
    if (allDevices) {
      await authApi.logoutAll().catch(() => undefined);
    } else {
      const refreshToken = await secureStorage.getRefreshToken();
      if (refreshToken) await authApi.logout({ refreshToken }).catch(() => undefined);
    }
  } finally {
    await stopBackgroundLocation().catch(() => undefined);
    await unregisterPushToken().catch(() => undefined);
    disconnectSocket();
    await secureStorage.clearRefreshToken().catch(() => undefined);
    useSessionStore.getState().clearSession();
    await resetDatabase().catch(() => undefined);
  }
}
