import { withObservables } from '@nozbe/watermelondb/react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
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

function formatDateTime(iso: string): string {
  return formatter.format(new Date(iso));
}

interface Props {
  task: TaskModel;
  notes: TaskNotePending[];
}

function HistorySectionBase({ task, notes }: Props) {
  const { data: events, isLoading, isError, refetch, isRefetching } = useTaskHistory(task.serverId);
  const sorted = [...(events ?? [])].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Historique</Text>
        <TouchableOpacity onPress={() => refetch()} disabled={isRefetching}>
          {isRefetching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.refreshText}>Actualiser</Text>
          )}
        </TouchableOpacity>
      </View>

      {notes.map((note) => (
        <View key={note.id} style={styles.eventRow}>
          <Text style={styles.eventSummary}>{note.text}</Text>
          <Text style={styles.eventPending}>en attente d’envoi</Text>
        </View>
      ))}

      {isLoading && <ActivityIndicator style={styles.loading} color={colors.primary} />}
      {isError && <Text style={styles.errorText}>Historique indisponible hors ligne</Text>}

      {sorted.map((event) => (
        <View key={event.id} style={styles.eventRow}>
          <Text style={styles.eventSummary}>{eventSummary(event)}</Text>
          <Text style={styles.eventMeta}>
            {event.actorName ? `${event.actorName} · ` : ''}
            {formatDateTime(event.occurredAt)}
          </Text>
        </View>
      ))}

      {!isLoading && !isError && sorted.length === 0 && notes.length === 0 && (
        <Text style={styles.emptyText}>Aucun historique</Text>
      )}
    </View>
  );
}

const enhance = withObservables(['task'], ({ task }: { task: TaskModel }) => ({
  notes: observePendingNotes(task.serverId),
}));

export const HistorySection = enhance(HistorySectionBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  refreshText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  loading: { marginVertical: 8 },
  errorText: { fontSize: 13, color: colors.warning, paddingVertical: 6 },
  eventRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  eventSummary: { fontSize: 14, color: colors.text },
  eventMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  eventPending: { fontSize: 11, color: colors.warning, marginTop: 2 },
  emptyText: { fontSize: 13, color: colors.textMuted, paddingVertical: 4 },
});
