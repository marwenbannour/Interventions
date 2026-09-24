import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TaskListScreen } from '../features/tasks/screens/TaskListScreen';
import { TaskDetailScreen } from '../features/tasks/screens/TaskDetailScreen';
import { PhotoCaptureScreen } from '../features/photos/screens/PhotoCaptureScreen';
import { SignatureScreen } from '../features/photos/screens/SignatureScreen';
import type { TaskStackParamList } from './types';

const Stack = createNativeStackNavigator<TaskStackParamList>();

export function TaskStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TaskList" component={TaskListScreen} options={{ title: 'Interventions' }} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Détail' }} />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Signature" component={SignatureScreen} options={{ title: 'Signature' }} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
