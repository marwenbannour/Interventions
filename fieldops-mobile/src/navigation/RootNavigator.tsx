import { DarkTheme, DefaultTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '../theme/ThemeProvider';
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
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import type { AppTabsParamList } from './types';

/**
 * Réf de navigation module-level : utilisée par le deep-link des notifications push (M6).
 * Typée sur AppTabsParamList — seul le cas authentifié (AppTabs monté) importe pour
 * la navigation déclenchée depuis l'extérieur d'un composant.
 */
export const navigationRef = createNavigationContainerRef<AppTabsParamList>();

export function RootNavigator() {
  useSilentRefresh();
  const status = useSessionStore((s) => s.status);
  const authenticated = status === 'authenticated';
  useSyncEngine(authenticated);
  usePhotoUploadQueue(authenticated);
  useAgentProfile(authenticated);
  useBackgroundLocation(authenticated);
  usePushNotifications(authenticated);
  useRealtime(authenticated);

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

  const { colors, isDark } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border },
    };
  }, [colors, isDark]);

  if (status === 'checking') return null;

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {status === 'authenticated' ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
