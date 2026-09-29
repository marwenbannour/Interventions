import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../../components/ui/Icon';
import { Card } from '../../../components/ui/primitives';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { submitChecklistUpdate } from '../actions/taskActions';
import type { Task as TaskModel } from '../db/models/Task';

export function ChecklistCard({ task }: { task: TaskModel }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (task.checklist.length === 0) return null;
  const done = task.checklist.filter((i) => i.done).length;

  const toggle = async (id: string, currentlyDone: boolean) => {
    setTogglingId(id);
    try {
      await submitChecklistUpdate(task, [{ id, done: !currentlyDone }]);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>Checklist</Text>
        <Text style={styles.progress}>
          {done}/{task.checklist.length}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(done / task.checklist.length) * 100}%` }]} />
      </View>
      {task.checklist.map((item) => (
        <TouchableOpacity key={item.id} style={styles.item} onPress={() => toggle(item.id, item.done)} disabled={togglingId === item.id}>
          {togglingId === item.id ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name={item.done ? 'check-box' : 'check-box-outline-blank'} size={24} color={item.done ? colors.success : colors.textMuted} />
          )}
          <Text style={[styles.label, item.done && styles.labelDone]}>
            {item.label}
            {item.required ? ' *' : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </Card>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    card: { gap: 6 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    progress: { fontSize: 13, fontWeight: '700', color: c.success },
    track: { height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden', marginBottom: 4 },
    fill: { height: '100%', backgroundColor: c.success },
    item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    label: { fontSize: 14, color: c.text, flexShrink: 1 },
    labelDone: { color: c.textMuted, textDecorationLine: 'line-through' },
  }),
);
