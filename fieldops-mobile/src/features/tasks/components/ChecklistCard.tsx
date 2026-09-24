import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { submitChecklistUpdate } from '../actions/taskActions';
import type { Task as TaskModel } from '../db/models/Task';

export function ChecklistCard({ task }: { task: TaskModel }) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (task.checklist.length === 0) return null;

  const toggle = async (id: string, currentlyDone: boolean) => {
    setTogglingId(id);
    try {
      await submitChecklistUpdate(task, [{ id, done: !currentlyDone }]);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Checklist</Text>
      {task.checklist.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.item}
          onPress={() => toggle(item.id, item.done)}
          disabled={togglingId === item.id}
        >
          <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
            {togglingId === item.id ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              item.done && <Text style={styles.checkboxMark}>✓</Text>
            )}
          </View>
          <Text style={[styles.label, item.done && styles.labelDone]}>
            {item.label}
            {item.required ? ' *' : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkboxMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  label: { fontSize: 14, color: colors.text, flexShrink: 1 },
  labelDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
});
