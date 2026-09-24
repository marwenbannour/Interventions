import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { submitTransition } from '../actions/taskActions';
import type { Task as TaskModel } from '../db/models/Task';
import type { AvailableTransition } from '../../../lib/api/types';

async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

interface Props {
  task: TaskModel;
  transitions: AvailableTransition[];
}

export function TransitionButtons({ task, transitions }: Props) {
  const [commentModal, setCommentModal] = useState<AvailableTransition | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (transition: AvailableTransition, commentText?: string) => {
    setBusy(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      if (transition.requiresLocation) {
        const pos = await getCurrentPosition();
        if (!pos) {
          Alert.alert(
            'Position requise',
            "Impossible d'obtenir votre position. Vérifiez que la localisation est activée pour FieldOps.",
          );
          return;
        }
        lat = pos.lat;
        lng = pos.lng;
      }
      await submitTransition(task, { to: transition.to, comment: commentText, lat, lng });
      setCommentModal(null);
      setComment('');
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Action impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  const onPress = (transition: AvailableTransition) => {
    if (transition.missing.length > 0) {
      Alert.alert(transition.label, transition.missing.join('\n'));
      return;
    }
    if (transition.requiresComment) {
      setComment('');
      setCommentModal(transition);
      return;
    }
    run(transition);
  };

  if (transitions.length === 0) return null;

  return (
    <View style={styles.container}>
      {transitions.map((t) => (
        <TouchableOpacity
          key={t.to}
          style={[styles.button, t.missing.length > 0 && styles.buttonDisabled]}
          onPress={() => onPress(t)}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={t.missing.length > 0 ? colors.textMuted : colors.primaryText} />
          ) : (
            <Text style={[styles.buttonText, t.missing.length > 0 && styles.buttonTextDisabled]}>{t.label}</Text>
          )}
        </TouchableOpacity>
      ))}

      <Modal visible={!!commentModal} transparent animationType="fade" onRequestClose={() => setCommentModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{commentModal?.label}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Commentaire (obligatoire)"
              value={comment}
              onChangeText={setComment}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCommentModal(null)} style={styles.modalCancel} disabled={busy}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => commentModal && run(commentModal, comment.trim())}
                style={[styles.modalConfirm, comment.trim().length < 3 && styles.buttonDisabled]}
                disabled={comment.trim().length < 3 || busy}
              >
                {busy ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.modalConfirmText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  buttonDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.primaryText, fontSize: 15, fontWeight: '600' },
  buttonTextDisabled: { color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: colors.text,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 14 },
  modalCancelText: { color: colors.textMuted, fontSize: 15 },
  modalConfirm: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
  modalConfirmText: { color: colors.primaryText, fontSize: 15, fontWeight: '600' },
});
