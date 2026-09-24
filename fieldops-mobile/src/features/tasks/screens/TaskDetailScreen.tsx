import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useEffect } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { database } from '../../../lib/db/database';
import { colors } from '../../../theme/colors';
import { priorityLabel, statusLabel } from '../utils/statusLabels';
import { ChecklistCard } from '../components/ChecklistCard';
import { HistorySection } from '../components/HistorySection';
import { NotesSection } from '../components/NotesSection';
import { PhotosSection } from '../components/PhotosSection';
import { TransitionButtons } from '../components/TransitionButtons';
import { useAvailableTransitions } from '../hooks/useAvailableTransitions';
import type { Task as TaskModel } from '../db/models/Task';
import type { PhotoType } from '../../../lib/api/types';
import type { TaskStackScreenProps } from '../../../navigation/types';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

interface Props extends TaskStackScreenProps<'TaskDetail'> {
  task: TaskModel | undefined;
}

function TaskDetailScreenBase({ task, navigation }: Props) {
  const transitions = useAvailableTransitions(task);
  const requiredTypes = [...new Set(transitions.flatMap((t) => t.requiredPhotos))] as PhotoType[];
  const requiresSignature = transitions.some((t) => t.requiresSignature);
  const site = task?.site;
  const hasContactInfo = !!(site?.contactName || site?.contactPhone || site?.accessInstructions);

  useEffect(() => {
    if (task) navigation.setOptions({ title: task.reference });
  }, [task, navigation]);

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Intervention introuvable localement.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {task.localStatus === 'pending' && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerText}>Modifications en attente de synchronisation</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.title}>{task.title}</Text>
        {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
        <InfoRow label="Statut" value={statusLabel(task.status)} />
        <InfoRow label="Priorité" value={priorityLabel(task.priority)} />
        <InfoRow label="Type" value={task.type} />
        <InfoRow label="Site" value={task.site?.name ?? '—'} />
        <InfoRow label="Adresse" value={task.site?.address ?? '—'} />
        <InfoRow label="Client" value={task.client?.name ?? '—'} />
      </View>

      {hasContactInfo && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact sur site</Text>
          {site?.contactName ? <InfoRow label="Nom" value={site.contactName} /> : null}
          {site?.contactPhone ? (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${site.contactPhone}`)}>
              <InfoRow label="Téléphone" value={site.contactPhone} />
            </TouchableOpacity>
          ) : null}
          {site?.accessInstructions ? (
            <View style={styles.accessInstructions}>
              <Text style={styles.infoLabel}>Accès</Text>
              <Text style={styles.description}>{site.accessInstructions}</Text>
            </View>
          ) : null}
        </View>
      )}

      <TransitionButtons task={task} transitions={transitions} />

      <PhotosSection
        task={task}
        requiredTypes={requiredTypes}
        requiresSignature={requiresSignature}
        onAddPhoto={(type: PhotoType) => navigation.navigate('PhotoCapture', { taskId: task.serverId, type })}
        onSign={() => navigation.navigate('Signature', { taskId: task.serverId })}
      />

      <ChecklistCard task={task} />

      <NotesSection task={task} />

      <HistorySection task={task} />

      {task.completionNotes ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes de clôture</Text>
          <Text style={styles.description}>{task.completionNotes}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// Query.observe() ne suit que l'appartenance à l'ensemble (ajout/retrait de lignes),
// PAS les changements de champs d'un enregistrement déjà présent (avertissement explicite
// de l'API WatermelonDB). switchMap vers Model.observe() une fois la ligne trouvée est le
// pattern correct pour une vue détail réactive à TOUS les changements de champs.
const enhance = withObservables(['route'], ({ route }: TaskStackScreenProps<'TaskDetail'>) => ({
  task: database.collections
    .get<TaskModel>('tasks')
    .query(Q.where('server_id', route.params.taskId))
    .observe()
    .pipe(switchMap((records) => (records[0] ? records[0].observe() : of(undefined)))),
}));

export const TaskDetailScreen = enhance(TaskDetailScreenBase);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  pendingBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pendingBannerText: { color: colors.warning, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  description: { fontSize: 14, color: colors.textMuted },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 13, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  accessInstructions: { paddingTop: 4, gap: 2 },
});
