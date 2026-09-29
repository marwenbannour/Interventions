import { NavigationContainer } from '@react-navigation/native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { registerForceLogoutHandler } from '../lib/api/client';
import { useSilentRefresh } from '../features/auth/hooks/useSilentRefresh';
import { useSessionStore } from '../features/auth/store/session.store';
import { useSyncEngine } from '../features/sync/hooks/useSyncEngine';
import { usePhotoUploadQueue } from '../features/photos/hooks/usePhotoUploadQueue';
import { useAgentProfile } from '../features/agents/hooks/useAgentProfile';
import { useDutyStore } from '../features/agents/store/duty.store';
import { useBackgroundLocation } from '../features/location/hooks/useBackgroundLocation';
import { stopBackgroundLocation } from '../features/location/services/backgroundLocation';
import { usePushNotifications } from '../features/notifications/hooks/usePushNotifications';
import { unregisterPushToken } from '../features/notifications/services/pushRegistration';
import { useRealtime } from '../features/notifications/hooks/useRealtime';
import { disconnectSocket } from '../lib/realtime/socket';
import { authApi } from '../features/auth/api/auth.api';
import { secureStorage } from '../lib/secureStorage';
import { colors } from '../theme/colors';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { ClientTabs } from './ClientTabs';
import { navigationRef } from './navigationRef';

/**
 * Cette app mobile ne couvre que AGENT (parcours terrain complet) et CLIENT (portail de
 * consultation + évaluation). ADMIN/SUPERVISOR/DIRECTION utilisent le backoffice web —
 * un écran clair vaut mieux qu'un AppTabs cassé plein d'appels 403 silencieux (même
 * raison que le blocage posé côté web pour AGENT/CLIENT sur le backoffice).
 */
function UnsupportedRoleScreen() {
  const clearSession = useSessionStore((s) => s.clearSession);

  const logout = async () => {
    const refreshToken = await secureStorage.getRefreshToken();
    if (refreshToken) await authApi.logout({ refreshToken }).catch(() => undefined);
    disconnectSocket();
    await secureStorage.clearRefreshToken().catch(() => undefined);
    clearSession();
  };

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Accès non pris en charge</Text>
      <Text style={styles.body}>
        Cette application mobile est réservée aux comptes Agent et Client. Utilisez le backoffice web pour les autres
        rôles.
      </Text>
      <Text style={styles.link} onPress={logout}>
        Se déconnecter
      </Text>
    </View>
  );
}

export function RootNavigator() {
  useSilentRefresh();
  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.user?.role);
  const authenticated = status === 'authenticated';
  const isAgent = authenticated && role === 'AGENT';
  const isClient = authenticated && role === 'CLIENT';

  useSyncEngine(isAgent);
  usePhotoUploadQueue(isAgent);
  useAgentProfile(isAgent);
  useBackgroundLocation(isAgent);
  usePushNotifications(isAgent || isClient);
  useRealtime(isAgent);

  useEffect(() => {
    registerForceLogoutHandler(() => {
      stopBackgroundLocation();
      useDutyStore.getState().setProfile(false, 'ACTIVE');
      disconnectSocket();
      unregisterPushToken();
    });
  }, []);

  useEffect(() => {
    if (status !== 'checking') SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  if (status === 'checking') return null;

  return (
    <NavigationContainer ref={navigationRef}>
      {isAgent ? <AppTabs /> : isClient ? <ClientTabs /> : authenticated ? <UnsupportedRoleScreen /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  link: { fontSize: 15, fontWeight: '600', color: colors.primary, marginTop: 8 },
});
