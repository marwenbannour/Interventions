import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { useMarkNotificationsRead, useNotifications } from '../hooks/useNotifications';
import type { AppTabsParamList } from '../../../navigation/types';
import type { NotificationRecord } from '../../../lib/api/types';

type Props = BottomTabScreenProps<AppTabsParamList, 'Notifications'>;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

function NotificationRow({ item, onPress }: { item: NotificationRecord; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.row, item.status !== 'READ' && styles.rowUnread]} onPress={onPress}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body} numberOfLines={2}>
        {item.body}
      </Text>
      <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
    </TouchableOpacity>
  );
}

export function NotificationsScreen({ navigation }: Props) {
  const { data, isLoading, isRefetching, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const notifications = data?.data ?? [];

  const openNotification = (item: NotificationRecord) => {
    if (item.status !== 'READ') markRead.mutate([item.id]);
    const taskId = item.data?.taskId;
    if (typeof taskId === 'string') {
      navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId } });
    }
  };

  return (
    <View style={styles.container}>
      {(data?.unread ?? 0) > 0 && (
        <TouchableOpacity style={styles.markAllButton} onPress={() => markRead.mutate('all')}>
          <Text style={styles.markAllText}>Tout marquer comme lu ({data?.unread})</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={<RefreshControl refreshing={isRefetching && !isLoading} onRefresh={() => refetch()} />}
        renderItem={({ item }) => <NotificationRow item={item} onPress={() => openNotification(item)} />}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune notification</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  markAllButton: { padding: 12, alignItems: 'center', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  markAllText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  row: {
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: { borderColor: colors.primary },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  body: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 15 },
});
