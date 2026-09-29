import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/ui/Icon';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Button } from '../../../components/ui/primitives';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { EMPTY_FILTERS, useTaskFiltersStore, type AdvancedFilters, type Period, type Priority } from '../store/taskFilters.store';
import type { StatusGroup } from '../utils/taskVisuals';
import type { TaskStackScreenProps } from '../../../navigation/types';

const GROUPS: { key: StatusGroup; label: string }[] = [
  { key: 'new', label: 'Nouvelles' },
  { key: 'active', label: 'En cours' },
  { key: 'done', label: 'Terminées' },
  { key: 'cancelled', label: 'Annulées' },
];
const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'URGENT', label: 'Urgente' },
  { key: 'HIGH', label: 'Haute' },
  { key: 'NORMAL', label: 'Normale' },
  { key: 'LOW', label: 'Basse' },
];
const PERIODS: { key: Period; label: string }[] = [
  { key: 'all', label: 'Toutes les dates' },
  { key: 'today', label: "Aujourd'hui" },
  { key: '7d', label: '7 derniers jours' },
  { key: '30d', label: '30 derniers jours' },
];

function CheckRow({ label, checked, onPress, radio }: { label: string; checked: boolean; onPress: () => void; radio?: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const icon = radio
    ? checked
      ? 'radio-button-checked'
      : 'radio-button-unchecked'
    : checked
      ? 'check-box'
      : 'check-box-outline-blank';
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Icon name={icon} size={22} color={checked ? colors.primary : colors.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function TaskFiltersScreen({ navigation }: TaskStackScreenProps<'TaskFilters'>) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const current = useTaskFiltersStore((s) => s.advanced);
  const setAdvanced = useTaskFiltersStore((s) => s.setAdvanced);
  const [draft, setDraft] = useState<AdvancedFilters>(current);

  const apply = () => {
    setAdvanced(draft);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Filtres"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => setDraft(EMPTY_FILTERS)}>
            <Text style={[styles.reset, { color: colors.primary }]}>Réinitialiser</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Statut</Text>
        <CheckRow label="Toutes" checked={draft.groups.length === 0} onPress={() => setDraft({ ...draft, groups: [] })} />
        {GROUPS.map((g) => (
          <CheckRow
            key={g.key}
            label={g.label}
            checked={draft.groups.includes(g.key)}
            onPress={() => setDraft({ ...draft, groups: toggle(draft.groups, g.key) })}
          />
        ))}

        <Text style={styles.section}>Priorité</Text>
        <CheckRow label="Toutes" checked={draft.priorities.length === 0} onPress={() => setDraft({ ...draft, priorities: [] })} />
        {PRIORITIES.map((p) => (
          <CheckRow
            key={p.key}
            label={p.label}
            checked={draft.priorities.includes(p.key)}
            onPress={() => setDraft({ ...draft, priorities: toggle(draft.priorities, p.key) })}
          />
        ))}

        <Text style={styles.section}>Date</Text>
        {PERIODS.map((p) => (
          <CheckRow key={p.key} radio label={p.label} checked={draft.period === p.key} onPress={() => setDraft({ ...draft, period: p.key })} />
        ))}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button label="Appliquer" onPress={apply} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingBottom: 24 },
    reset: { fontSize: 14, fontWeight: '600' },
    section: { fontSize: 14, fontWeight: '700', color: c.text, marginTop: 20, marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
    rowLabel: { fontSize: 15, color: c.text },
    footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  }),
);
