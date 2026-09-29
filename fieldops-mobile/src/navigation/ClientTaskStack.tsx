import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClientTaskListScreen } from '../features/client/screens/ClientTaskListScreen';
import { ClientTaskDetailScreen } from '../features/client/screens/ClientTaskDetailScreen';
import type { TaskStackParamList } from './types';

/**
 * Réutilise TaskStackParamList (partagé avec le parcours Agent) pour que le deep-link
 * des notifications (Tasks -> TaskDetail, cf. usePushNotifications) fonctionne à l'identique
 * pour un compte CLIENT sans logique conditionnelle — seuls TaskList/TaskDetail sont
 * enregistrés, PhotoCapture/Signature ne concernent jamais ce rôle.
 */
const Stack = createNativeStackNavigator<TaskStackParamList>();

export function ClientTaskStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TaskList" component={ClientTaskListScreen} options={{ title: 'Mes interventions' }} />
      <Stack.Screen name="TaskDetail" component={ClientTaskDetailScreen} options={{ title: 'Détail' }} />
    </Stack.Navigator>
  );
}
