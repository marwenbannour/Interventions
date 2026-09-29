import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../../components/ui/Icon';
import { Card } from '../../../components/ui/primitives';
import { radius } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { submitNote } from '../actions/taskActions';
import type { Task as TaskModel } from '../db/models/Task';

/** Saisie de note — l'affichage (notes en attente + historique confirmé) est dans HistorySection. */
export function NotesSection({ task }: { task: TaskModel }) {
  const { colors } = useTheme();
  const styles = useStyles();
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

  const disabled = sending || text.trim().length === 0;

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Ajouter une note</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Écrire une note…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          editable={!sending}
          multiline
        />
        <TouchableOpacity style={[styles.send, disabled && { opacity: 0.4 }]} onPress={send} disabled={disabled}>
          {sending ? <ActivityIndicator color={colors.onPrimary} /> : <Icon name="send" size={20} color={colors.onPrimary} />}
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    card: { gap: 10 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.background,
      maxHeight: 120,
    },
    send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  }),
);
