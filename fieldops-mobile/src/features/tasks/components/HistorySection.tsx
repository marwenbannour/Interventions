import { withObservables } from '@nozbe/watermelondb/react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../../components/ui/Icon';
import { Card } from '../../../components/ui/primitives';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { observePendingNotes } from '../db/taskNoteRepository';
import { useTaskHistory } from '../hooks/useTaskHistory';
import { eventSummary } from '../utils/eventLabels';
import type { Task as TaskModel } from '../db/models/Task';
import type { TaskNotePending } from '../db/models/TaskNotePending';

const formatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

interface Props {
  task: TaskModel;
  notes: TaskNotePending[];
}

function HistorySectionBase({ task, notes }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { data: events, isLoading, isError, refetch, isRefetching } = useTaskHistory(task.serverId);
  const sorted = [...(events ?? [])].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Historique</Text>
        <TouchableOpacity onPress={() => refetch()} disabled={isRefetching} hitSlop={8}>
          {isRefetching ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="refresh" size={20} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      {notes.map((note) => (
        <View key={note.id} style={styles.event}>
          <View style={[styles.dot, { backgroundColor: colors.warning }]} />
          <View style={styles.eventBody}>
            <Text style={styles.summary}>{note.text}</Text>
            <Text style={[styles.meta, { color: colors.warning }]}>en attente d’envoi</Text>
          </View>
        </View>
      ))}

      {isLoading ? <ActivityIndicator style={styles.loading} color={colors.primary} /> : null}
      {isError ? <Text style={[styles.meta, { color: colors.warning }]}>Historique indisponible hors ligne</Text> : null}

      {sorted.map((event, index) => (
        <View key={event.id} style={styles.event}>
          <View style={[styles.dot, { backgroundColor: index === 0 ? colors.primary : colors.border }]} />
          <View style={styles.eventBody}>
            <Text style={styles.summary}>{eventSummary(event)}</Text>
            <Text style={styles.meta}>
              {event.actorName ? `${event.actorName} · ` : ''}
              {formatter.format(new Date(event.occurredAt))}
            </Text>
          </View>
        </View>
      ))}

      {!isLoading && !isError && sorted.length === 0 && notes.length === 0 ? <Text style={styles.meta}>Aucun historique</Text> : null}
    </Card>
  );
}

export const HistorySection = withObservables(['task'], ({ task }: { task: TaskModel }) => ({
  notes: observePendingNotes(task.serverId),
}))(HistorySectionBase);

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    card: { gap: 4 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    loading: { marginVertical: 8 },
    event: { flexDirection: 'row', gap: 12, paddingVertical: 6 },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
    eventBody: { flex: 1 },
    summary: { fontSize: 14, color: c.text },
    meta: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  }),
);
