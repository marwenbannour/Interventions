import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { statusLabel, priorityLabel } from '../../tasks/utils/statusLabels';
import { useClientTasks } from '../hooks/useClientTasks';
import type { Task } from '../../../lib/api/types';
import type { TaskStackScreenProps } from '../../../navigation/types';

function TaskRow({ task, onPress }: { task: Task; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowHeader}>
        <Text style={styles.reference}>{task.reference}</Text>
        <Text style={styles.priority}>{priorityLabel(task.priority)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {task.title}
      </Text>
      <Text style={styles.siteName} numberOfLines={1}>
        {task.site?.name ?? ''}
      </Text>
      <Text style={styles.status}>{statusLabel(task.status)}</Text>
    </TouchableOpacity>
  );
}

export function ClientTaskListScreen({ navigation }: TaskStackScreenProps<'TaskList'>) {
  const { data, isLoading, isRefetching, refetch } = useClientTasks({ limit: 50 });
  const tasks = data?.data ?? [];

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tasks.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={<RefreshControl refreshing={isRefetching && !isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <TaskRow task={item} onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })} />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{isLoading ? 'Chargement…' : 'Aucune intervention pour le moment'}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  reference: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  priority: { fontSize: 12, color: colors.textMuted },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4 },
  siteName: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  status: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 6 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 15 },
});
