import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { AgentInfoScreen } from '../features/profile/screens/AgentInfoScreen';
import { ChangePasswordScreen } from '../features/profile/screens/ChangePasswordScreen';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="AgentInfo" component={AgentInfoScreen} />
    </Stack.Navigator>
  );
}
