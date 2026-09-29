import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ClientTaskStack } from './ClientTaskStack';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { ClientProfileScreen } from '../features/client/screens/ClientProfileScreen';
import { colors } from '../theme/colors';
import type { AppTabsParamList } from './types';

/** Réutilise AppTabsParamList (partagé avec AppTabs/Agent) — même raison que ClientTaskStack. */
const Tab = createBottomTabNavigator<AppTabsParamList>();

export function ClientTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="Tasks" component={ClientTaskStack} options={{ title: 'Interventions', headerShown: false }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Tab.Screen name="Profile" component={ClientProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}
