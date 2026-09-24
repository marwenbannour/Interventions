import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { submitNote } from '../actions/taskActions';
import type { Task as TaskModel } from '../db/models/Task';

/** Saisie de note — l'affichage (notes en attente + historique confirmé) est dans HistorySection. */
export function NotesSection({ task }: { task: TaskModel }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await submitNote(task, trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Ajouter une note</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Écrire une note…"
          value={text}
          onChangeText={setText}
          editable={!sending}
        />
        <TouchableOpacity style={styles.sendButton} onPress={send} disabled={sending || text.trim().length === 0}>
          {sending ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.sendText}>OK</Text>}
        </TouchableOpacity>
      </View>
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
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: colors.primaryText, fontWeight: '600' },
});
