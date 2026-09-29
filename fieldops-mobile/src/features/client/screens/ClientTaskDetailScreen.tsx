import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { ApiError } from '../../../lib/api/errors';
import { photoTypeLabel, priorityLabel, statusLabel } from '../../tasks/utils/statusLabels';
import { useClientEvaluation, useClientTaskDetail, useClientTaskPhotos, useCreateEvaluation } from '../hooks/useClientTasks';
import { StarInput } from '../components/StarInput';
import type { TaskStackScreenProps } from '../../../navigation/types';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EvaluateForm({ taskId }: { taskId: string }) {
  const [rating, setRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = useCreateEvaluation();

  const submit = async () => {
    if (rating === 0) {
      setError('Merci de donner une note globale.');
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        taskId,
        rating,
        punctualityRating: punctualityRating || undefined,
        qualityRating: qualityRating || undefined,
        comment: comment.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Envoi impossible.');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Votre intervention est terminée. Donnez-nous votre avis !</Text>
      <StarInput value={rating} onChange={setRating} label="Note globale" />
      <StarInput value={punctualityRating} onChange={setPunctualityRating} label="Ponctualité" />
      <StarInput value={qualityRating} onChange={setQualityRating} label="Qualité du travail" />
      <TextInput
        style={styles.commentInput}
        placeholder="Commentaire (optionnel)"
        placeholderTextColor={colors.textMuted}
        value={comment}
        onChangeText={setComment}
        multiline
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TouchableOpacity style={styles.submitButton} onPress={submit} disabled={create.isPending}>
        {create.isPending ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.submitButtonText}>Envoyer</Text>}
      </TouchableOpacity>
    </View>
  );
}

export function ClientTaskDetailScreen({ route }: TaskStackScreenProps<'TaskDetail'>) {
  const { taskId } = route.params;
  const { data: task, isLoading } = useClientTaskDetail(taskId);
  const { data: photos } = useClientTaskPhotos(taskId);
  const { data: evaluationsPage } = useClientEvaluation(taskId);
  const evaluation = evaluationsPage?.data[0];

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Intervention introuvable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{task.title}</Text>
        {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
        <InfoRow label="Statut" value={statusLabel(task.status)} />
        <InfoRow label="Priorité" value={priorityLabel(task.priority)} />
        <InfoRow label="Site" value={task.site?.name ?? '—'} />
        <InfoRow label="Adresse" value={task.site?.address ?? '—'} />
        {task.completionNotes ? <InfoRow label="Notes de clôture" value={task.completionNotes} /> : null}
      </View>

      {photos && photos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Photos</Text>
          <View style={styles.photoGrid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoWrapper}>
                {photo.url ? (
                  <Image source={{ uri: photo.url }} style={styles.photo} contentFit="cover" />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Text style={styles.emptyText}>Indisponible</Text>
                  </View>
                )}
                <Text style={styles.photoLabel}>{photoTypeLabel(photo.type)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {task.status === 'COMPLETED' && <EvaluateForm taskId={task.id} />}

      {evaluation && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Votre évaluation</Text>
          <Text style={styles.starsDisplay}>{'★'.repeat(evaluation.rating)}{'☆'.repeat(5 - evaluation.rating)}</Text>
          {evaluation.comment ? <Text style={styles.description}>{evaluation.comment}</Text> : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  description: { fontSize: 14, color: colors.textMuted },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 13, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrapper: { width: '31%', gap: 4 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: colors.background },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  errorText: { fontSize: 13, color: colors.danger },
  submitButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitButtonText: { color: colors.primaryText, fontSize: 15, fontWeight: '600' },
  starsDisplay: { fontSize: 22, color: '#F59E0B' },
});
