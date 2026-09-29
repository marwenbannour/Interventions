import { withObservables } from '@nozbe/watermelondb/react';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { HeaderIconButton, ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Chip, EmptyState, SearchBar } from '../../../components/ui/primitives';
import { database } from '../../../lib/db/database';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { runSync } from '../../sync/engine/syncEngine';
import { SyncBanner } from '../components/SyncBanner';
import { TaskCard } from '../components/TaskCard';
import { applyTaskFilters, countAdvanced, useTaskFiltersStore, type QuickFilter } from '../store/taskFilters.store';
import type { Task as TaskModel } from '../db/models/Task';
import type { TaskStackScreenProps } from '../../../navigation/types';

const QUICK: { key: QuickFilter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'urgent', label: 'Urgentes' },
  { key: 'active', label: 'En cours' },
  { key: 'done', label: 'Terminées' },
];

interface Props extends TaskStackScreenProps<'TaskList'> {
  tasks: TaskModel[];
}

function TaskListScreenBase({ tasks, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [refreshing, setRefreshing] = useState(false);
  const { quick, search, advanced, setQuick, setSearch } = useTaskFiltersStore();
  const visible = applyTaskFilters(tasks, quick, search, advanced);
  const activeFilters = countAdvanced(advanced);

  const onRefresh = async () => {
    setRefreshing(true);
    await runSync();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Interventions"
        large
        right={<HeaderIconButton icon="tune" badge={activeFilters || undefined} onPress={() => navigation.navigate('TaskFilters')} />}
      />
      <View style={styles.controls}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher une intervention…" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {QUICK.map((q) => (
            <Chip key={q.key} label={q.label} selected={quick === q.key} onPress={() => setQuick(q.key)} />
          ))}
        </ScrollView>
      </View>
      <SyncBanner />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TaskCard task={item} onPress={() => navigation.navigate('TaskDetail', { taskId: item.serverId })} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="inbox"
            title="Aucune intervention"
            hint={search || activeFilters || quick !== 'all' ? 'Modifiez la recherche ou les filtres.' : 'Tirez vers le bas pour synchroniser.'}
          />
        }
      />
    </View>
  );
}

const enhance = withObservables([], () => ({
  tasks: database.collections.get<TaskModel>('tasks').query().observe(),
}));

export const TaskListScreen = enhance(TaskListScreenBase);

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    controls: { paddingHorizontal: 16, gap: 12, paddingBottom: 12 },
    chips: { gap: 8 },
    list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  }),
);
