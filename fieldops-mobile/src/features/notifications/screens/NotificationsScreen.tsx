import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HeaderIconButton, ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Card, EmptyState, IconBubble } from '../../../components/ui/primitives';
import type { IconName } from '../../../components/ui/Icon';
import { radius, type Tone } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { formatShortWhen } from '../../tasks/utils/taskVisuals';
import { useMarkNotificationsRead, useNotifications } from '../hooks/useNotifications';
import type { AppTabScreenProps } from '../../../navigation/types';
import type { NotificationRecord } from '../../../lib/api/types';

function visual(item: NotificationRecord): { icon: IconName; tone: Tone } {
  if (item.type === 'TASK_ASSIGNED') return { icon: 'assignment', tone: 'primary' };
  if (item.type === 'SLA_BREACHED') return { icon: 'error-outline', tone: 'danger' };
  if (item.type === 'SLA_WARNING') return { icon: 'alarm', tone: 'warning' };
  if (item.type === 'MANUAL') return { icon: 'chat-bubble-outline', tone: 'secondary' };
  if (/termin|clôtur/i.test(item.title)) return { icon: 'check-circle-outline', tone: 'success' };
  return { icon: 'update', tone: 'primary' };
}

function NotificationRow({ item, onPress }: { item: NotificationRecord; onPress: () => void }) {
  const styles = useStyles();
  const unread = item.status !== 'READ';
  const { icon, tone } = visual(item);
  return (
    <Card onPress={onPress} style={[styles.row, unread && styles.rowUnread]}>
      <IconBubble name={icon} tone={tone} size={40} />
      <View style={styles.texts}>
        <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      <View style={styles.side}>
        <Text style={styles.time}>{formatShortWhen(item.createdAt)}</Text>
        {unread ? <View style={styles.dot} /> : null}
      </View>
    </Card>
  );
}

export function NotificationsScreen({ navigation }: AppTabScreenProps<'Notifications'>) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading, isRefetching, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const all = data?.data ?? [];
  const notifications = unreadOnly ? all.filter((n) => n.status !== 'READ') : all;
  const unread = data?.unread ?? 0;

  const openNotification = (item: NotificationRecord) => {
    if (item.status !== 'READ') markRead.mutate([item.id]);
    const taskId = item.data?.taskId;
    if (typeof taskId === 'string') {
      navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId }, initial: false });
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Notifications"
        large
        right={unread > 0 ? <HeaderIconButton icon="done-all" onPress={() => markRead.mutate('all')} /> : null}
      />
      <View style={styles.segment}>
        {[
          { key: false, label: 'Toutes' },
          { key: true, label: `Non lues${unread ? ` (${unread})` : ''}` },
        ].map((tab) => (
          <TouchableOpacity
            key={String(tab.key)}
            style={[styles.segmentItem, unreadOnly === tab.key && { backgroundColor: colors.primary }]}
            onPress={() => setUnreadOnly(tab.key)}
          >
            <Text style={[styles.segmentText, { color: unreadOnly === tab.key ? colors.onPrimary : colors.textMuted }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary} />}
        renderItem={({ item }) => <NotificationRow item={item} onPress={() => openNotification(item)} />}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState icon="notifications-none" title={unreadOnly ? 'Aucune notification non lue' : 'Aucune notification'} />
          )
        }
      />
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    segment: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 4,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
    segmentText: { fontSize: 13, fontWeight: '700' },
    list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    rowUnread: { borderColor: c.primary },
    texts: { flex: 1, gap: 2 },
    title: { fontSize: 14, fontWeight: '600', color: c.text },
    titleUnread: { fontWeight: '800' },
    body: { fontSize: 12, color: c.textMuted },
    side: { alignItems: 'flex-end', gap: 8, alignSelf: 'stretch' },
    time: { fontSize: 11, color: c.textMuted },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
  }),
);
