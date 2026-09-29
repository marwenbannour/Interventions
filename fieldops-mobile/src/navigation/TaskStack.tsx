import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TaskListScreen } from '../features/tasks/screens/TaskListScreen';
import { TaskDetailScreen } from '../features/tasks/screens/TaskDetailScreen';
import { TaskFiltersScreen } from '../features/tasks/screens/TaskFiltersScreen';
import { PhotoCaptureScreen } from '../features/photos/screens/PhotoCaptureScreen';
import { SignatureScreen } from '../features/photos/screens/SignatureScreen';
import type { TaskStackParamList } from './types';

const Stack = createNativeStackNavigator<TaskStackParamList>();

export function TaskStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TaskList" component={TaskListScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <Stack.Screen name="TaskFilters" component={TaskFiltersScreen} />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} />
        <Stack.Screen name="Signature" component={SignatureScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
