import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { database } from '../../../lib/db/database';
import { colors } from '../../../theme/colors';
import { runSync } from '../../sync/engine/syncEngine';
import { useSyncStatusStore } from '../../sync/store/syncStatus.store';
import { priorityLabel, statusLabel } from '../utils/statusLabels';
import type { Task as TaskModel } from '../db/models/Task';
import type { TaskStackScreenProps } from '../../../navigation/types';

const TERMINAL_STATUSES = ['COMPLETED', 'EVALUATED', 'CANCELLED'];

function SyncBanner() {
  const phase = useSyncStatusStore((s) => s.phase);
  const lastError = useSyncStatusStore((s) => s.lastError);

  if (phase === 'idle') return null;
  const label =
    phase === 'syncing'
      ? 'Synchronisation…'
      : phase === 'offline'
        ? 'Hors ligne — les données affichées peuvent être obsolètes'
        : `Erreur de synchronisation : ${lastError ?? ''}`;
  const color = phase === 'error' ? colors.danger : phase === 'offline' ? colors.warning : colors.textMuted;

  return (
    <View style={styles.banner}>
      <Text style={[styles.bannerText, { color }]}>{label}</Text>
    </View>
  );
}

function TaskRowBase({ task, onPress }: { task: TaskModel; onPress: () => void }) {
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
      <View style={styles.statusRow}>
        <Text style={styles.status}>{statusLabel(task.status)}</Text>
        {task.localStatus === 'pending' && <Text style={styles.pendingBadge}>en attente de sync</Text>}
      </View>
    </TouchableOpacity>
  );
}

// La requête de la liste ne suit que l'appartenance à l'ensemble (voir TaskDetailScreen) —
// chaque ligne s'abonne donc à son propre modèle pour refléter ses changements de champs
// (statut, localStatus...) sans dépendre d'un ajout/retrait dans la liste.
const enhanceRow = withObservables(['task'], ({ task }: { task: TaskModel }) => ({ task }));
const TaskRow = enhanceRow(TaskRowBase);

interface Props extends TaskStackScreenProps<'TaskList'> {
  tasks: TaskModel[];
}

function TaskListScreenBase({ tasks, navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const active = tasks.filter((t) => !TERMINAL_STATUSES.includes(t.status));

  const onRefresh = async () => {
    setRefreshing(true);
    await runSync();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <SyncBanner />
      <FlatList
        data={active}
        keyExtractor={(item) => item.id}
        contentContainerStyle={active.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TaskRow task={item} onPress={() => navigation.navigate('TaskDetail', { taskId: item.serverId })} />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune intervention en cours</Text>}
      />
    </View>
  );
}

const enhance = withObservables([], () => ({
  tasks: database.collections.get<TaskModel>('tasks').query(Q.sortBy('scheduled_start', Q.asc)),
}));

export const TaskListScreen = enhance(TaskListScreenBase);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  banner: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  bannerText: { fontSize: 13 },
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  status: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  pendingBadge: { fontSize: 11, color: colors.warning, fontWeight: '600' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 15 },
});
