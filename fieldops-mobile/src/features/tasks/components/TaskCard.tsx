import { withObservables } from '@nozbe/watermelondb/react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, Card, IconBubble } from '../../../components/ui/primitives';
import { Icon } from '../../../components/ui/Icon';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { priorityLabel } from '../utils/statusLabels';
import { formatWhen, priorityTone, STATUS_GROUP_LABEL, statusGroup, statusTone, taskTypeIcon } from '../utils/taskVisuals';
import type { Task as TaskModel } from '../db/models/Task';

interface Props {
  task: TaskModel;
  onPress: () => void;
  /** Distance affichée à droite (carte : interventions à proximité). */
  distanceKm?: number | null;
  compact?: boolean;
}

function TaskCardBase({ task, onPress, distanceKm, compact }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Card onPress={onPress} style={styles.card}>
      <IconBubble name={taskTypeIcon(task.type)} tone={priorityTone(task.priority)} size={compact ? 36 : 42} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.reference}>#{task.reference}</Text>
          <Badge label={priorityLabel(task.priority)} tone={priorityTone(task.priority)} solid />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {task.site?.name ?? '—'}
          {distanceKm != null ? ` • ${distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}` : ''}
        </Text>
        {!compact ? (
          <View style={styles.bottomRow}>
            <View style={styles.when}>
              <Icon name="schedule" size={14} color={colors.textMuted} />
              <Text style={styles.meta}>{formatWhen(task.scheduledStart)}</Text>
            </View>
            <View style={styles.badges}>
              {task.localStatus === 'pending' ? <Icon name="cloud-upload" size={16} color={colors.warning} /> : null}
              <Badge label={STATUS_GROUP_LABEL[statusGroup(task.status)]} tone={statusTone(task.status)} />
            </View>
          </View>
        ) : (
          <Text style={styles.meta}>{formatWhen(task.scheduledStart)}</Text>
        )}
      </View>
    </Card>
  );
}

// Chaque carte s'abonne à son propre modèle : une requête de liste ne suit que l'appartenance
// à l'ensemble, pas les changements de champs (statut, localStatus…) d'une ligne déjà présente.
export const TaskCard = withObservables(['task'], ({ task }: { task: TaskModel }) => ({ task }))(TaskCardBase);

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    card: { flexDirection: 'row', gap: 12, padding: 14 },
    body: { flex: 1, gap: 3 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    reference: { fontSize: 13, fontWeight: '700', color: c.text },
    title: { fontSize: 15, fontWeight: '600', color: c.text },
    meta: { fontSize: 12, color: c.textMuted },
    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    when: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
    badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  }),
);
