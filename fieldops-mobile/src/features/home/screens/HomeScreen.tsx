import { withObservables } from '@nozbe/watermelondb/react';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../../components/ui/Avatar';
import { HeaderIconButton } from '../../../components/ui/ScreenHeader';
import { Card, EmptyState, SectionTitle, StatTile } from '../../../components/ui/primitives';
import { database } from '../../../lib/db/database';
import { radius } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { useDutyStore } from '../../agents/store/duty.store';
import { useSessionStore } from '../../auth/store/session.store';
import { useNotifications } from '../../notifications/hooks/useNotifications';
import { runSync } from '../../sync/engine/syncEngine';
import { SyncBanner } from '../../tasks/components/SyncBanner';
import { TaskCard } from '../../tasks/components/TaskCard';
import { useTaskFiltersStore, type QuickFilter } from '../../tasks/store/taskFilters.store';
import { PRIORITY_RANK, statusGroup } from '../../tasks/utils/taskVisuals';
import type { Task as TaskModel } from '../../tasks/db/models/Task';
import type { AppTabScreenProps } from '../../../navigation/types';

const WEEKDAY = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Interventions terminées par jour sur les 7 derniers jours (date de fin réelle). */
function lastSevenDays(tasks: TaskModel[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return { start: d.getTime(), label: WEEKDAY[d.getDay()], count: 0 };
  });
  for (const t of tasks) {
    const completedAt = t.milestones?.completedAt;
    if (!completedAt) continue;
    const ts = new Date(completedAt).getTime();
    const slot = days.find((d) => ts >= d.start && ts < d.start + 86_400_000);
    if (slot) slot.count += 1;
  }
  return days;
}

type Props = AppTabScreenProps<'Home'> & { tasks: TaskModel[] };

function HomeScreenBase({ tasks, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const user = useSessionStore((s) => s.user);
  const isOnDuty = useDutyStore((s) => s.isOnDuty);
  const setQuick = useTaskFiltersStore((s) => s.setQuick);
  const { data: notifications } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const groups = tasks.map((t) => statusGroup(t.status));
  const count = (g: string) => groups.filter((x) => x === g).length;
  const urgent = tasks
    .filter((t) => ['URGENT', 'HIGH'].includes(t.priority) && ['new', 'active'].includes(statusGroup(t.status)))
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))
    .slice(0, 3);
  const week = lastSevenDays(tasks);
  const weekMax = Math.max(1, ...week.map((d) => d.count));
  const weekTotal = week.reduce((s, d) => s + d.count, 0);

  const openList = (quick: QuickFilter) => {
    setQuick(quick);
    navigation.navigate('Tasks', { screen: 'TaskList' });
  };
  const openTask = (taskId: string) => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId }, initial: false });

  const onRefresh = async () => {
    setRefreshing(true);
    await runSync();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={styles.hello}>Bonjour, {user?.firstName ?? ''} 👋</Text>
          <View style={styles.subRow}>
            <Text style={styles.subtitle}>Agent d&apos;intervention</Text>
            <View style={[styles.dot, { backgroundColor: isOnDuty ? colors.success : colors.textMuted }]} />
            <Text style={styles.subtitle}>{isOnDuty ? 'En service' : 'Hors service'}</Text>
          </View>
        </View>
        <HeaderIconButton icon="notifications-none" badge={notifications?.unread} onPress={() => navigation.navigate('Notifications')} />
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { screen: 'ProfileHome' })}>
          <Avatar firstName={user?.firstName} lastName={user?.lastName} size={40} />
        </TouchableOpacity>
      </View>

      <View style={styles.bannerWrap}>
        <SyncBanner />
      </View>

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <StatTile value={tasks.length} label="Total" color={colors.primary} onPress={() => openList('all')} />
          <StatTile value={count('new')} label="Nouvelles" color={colors.warning} onPress={() => openList('active')} />
        </View>
        <View style={styles.gridRow}>
          <StatTile value={count('active')} label="En cours" color={colors.success} onPress={() => openList('active')} />
          <StatTile value={count('done')} label="Terminées" color={colors.secondary} onPress={() => openList('done')} />
        </View>
      </View>

      <SectionTitle title="Interventions urgentes" action="Voir tout" onAction={() => openList('urgent')} />
      <View style={styles.list}>
        {urgent.length === 0 ? (
          <Card>
            <EmptyState icon="task-alt" title="Aucune intervention urgente" />
          </Card>
        ) : (
          urgent.map((t) => <TaskCard key={t.id} task={t} onPress={() => openTask(t.serverId)} />)
        )}
      </View>

      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Évolution des interventions</Text>
          <Text style={styles.chartPeriod}>7 jours</Text>
        </View>
        <Text style={styles.chartHint}>
          {weekTotal} intervention{weekTotal > 1 ? 's' : ''} terminée{weekTotal > 1 ? 's' : ''} cette semaine
        </Text>
        <View style={styles.chart}>
          {week.map((d, i) => (
            <View key={d.start} style={styles.barCol}>
              <Text style={styles.barValue}>{d.count || ''}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: `${Math.max(4, (d.count / weekMax) * 100)}%`, backgroundColor: i === 6 ? colors.primary : colors.primarySoft },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, i === 6 && { color: colors.primary, fontWeight: '700' }]}>{d.label}</Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const enhance = withObservables([], () => ({
  tasks: database.collections.get<TaskModel>('tasks').query().observe(),
}));

export const HomeScreen = enhance(HomeScreenBase);

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    greeting: { flex: 1 },
    hello: { fontSize: 22, fontWeight: '700', color: c.text },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    subtitle: { fontSize: 13, color: c.textMuted },
    dot: { width: 7, height: 7, borderRadius: 4, marginLeft: 4 },
    bannerWrap: { marginHorizontal: -16, marginBottom: -8 },
    grid: { gap: 12 },
    gridRow: { flexDirection: 'row', gap: 12 },
    list: { gap: 10, marginTop: -4 },
    chartCard: { gap: 6 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chartTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    chartPeriod: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
    chartHint: { fontSize: 12, color: c.textMuted },
    chart: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 8, marginTop: 8 },
    barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%' },
    barValue: { fontSize: 11, color: c.textMuted, height: 14 },
    barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
    bar: { width: '100%', borderRadius: radius.sm },
    barLabel: { fontSize: 11, color: c.textMuted },
  }),
);
