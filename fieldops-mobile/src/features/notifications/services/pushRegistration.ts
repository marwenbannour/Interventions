import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getMeta, setMeta } from '../../sync/db/syncMetaRepository';
import { notificationsApi } from '../api/notifications.api';
import { usePreferencesStore } from '../../settings/store/preferences.store';
import type { DevicePlatform } from '../../../lib/api/types';

const LAST_TOKEN_KEY = 'lastRegisteredPushToken';

/** Catégorie de préférence (écran Paramètres) d'un type de notification serveur. */
function isMutedByPreferences(type: unknown): boolean {
  const prefs = usePreferencesStore.getState();
  if (type === 'TASK_ASSIGNED') return !prefs.notifyNewTasks;
  if (typeof type === 'string' && type.startsWith('SLA_')) return !prefs.notifyReminders;
  if (type === 'MANUAL') return !prefs.notifyMessages;
  return false;
}

// App au premier plan : les catégories désactivées restent dans la liste in-app, sans bannière ni son.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const muted = isMutedByPreferences(notification.request.content.data?.type);
    return { shouldShowBanner: !muted, shouldShowList: true, shouldPlaySound: !muted, shouldSetBadge: true };
  },
});

function currentPlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Demande la permission (si nécessaire) et (dés)enregistre le token Expo Push.
 * Dédupliqué contre le dernier token effectivement enregistré (les tokens peuvent
 * changer entre deux lancements de l'app).
 */
export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return; // pas de push sur simulateur/émulateur sans service Google/Apple

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const lastRegistered = await getMeta(LAST_TOKEN_KEY);
  if (token === lastRegistered) return;

  await notificationsApi.registerDevice(token, currentPlatform());
  await setMeta(LAST_TOKEN_KEY, token);
}

export async function unregisterPushToken(): Promise<void> {
  const token = await getMeta(LAST_TOKEN_KEY);
  if (!token) return;
  await notificationsApi.unregisterDevice(token).catch(() => undefined);
}
