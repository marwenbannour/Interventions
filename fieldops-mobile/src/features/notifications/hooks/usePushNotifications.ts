import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { navigationRef } from '../../../navigation/RootNavigator';
import { registerPushToken } from '../services/pushRegistration';

function navigateFromNotification(response: Notifications.NotificationResponse | null): void {
  const taskId = response?.notification.request.content.data?.taskId as string | undefined;
  if (!taskId || !navigationRef.isReady()) return;
  navigationRef.navigate('Tasks', { screen: 'TaskDetail', params: { taskId } });
}

/**
 * Enregistre le token Expo Push une fois authentifié, et branche le tap sur une
 * notification vers le détail de l'intervention concernée (data.taskId), y compris
 * au démarrage à froid (app tuée puis relancée par le tap).
 */
export function usePushNotifications(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    registerPushToken().catch(() => undefined);

    const cold = Notifications.getLastNotificationResponse();
    if (cold) navigateFromNotification(cold);

    const subscription = Notifications.addNotificationResponseReceivedListener(navigateFromNotification);
    return () => subscription.remove();
  }, [enabled]);
}
