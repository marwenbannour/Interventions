import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, type IconName } from '../components/ui/Icon';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { MapScreen } from '../features/map/screens/MapScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { useTheme } from '../theme/ThemeProvider';
import { ProfileStack } from './ProfileStack';
import { TaskStack } from './TaskStack';
import type { AppTabsParamList } from './types';

const Tab = createBottomTabNavigator<AppTabsParamList>();

const ICONS: Record<keyof AppTabsParamList, IconName> = {
  Home: 'home',
  Tasks: 'event-note',
  Map: 'map',
  Notifications: 'notifications',
  Profile: 'person',
};

export function AppTabs() {
  const { colors } = useTheme();
  const { data: notifications } = useNotifications();
  const unread = notifications?.unread ?? 0;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
        tabBarIcon: ({ color }) => <Icon name={ICONS[route.name]} size={24} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Accueil' }} />
      <Tab.Screen name="Tasks" component={TaskStack} options={{ title: 'Interventions' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Carte' }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications', tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined }}
      />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}
