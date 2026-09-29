import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../../components/ui/primitives';
import { radius } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { submitTransition } from '../actions/taskActions';
import { checkAssetScan } from '../../sync/engine/workflowEngine';
import { AssetScanModal } from './AssetScanModal';
import type { Task as TaskModel } from '../db/models/Task';
import type { AvailableTransition } from '../../../lib/api/types';

async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

/** Transitions « de retrait » (refus, annulation, non-conformité) affichées en rouge. */
const isBackward = (t: AvailableTransition) => /refus|annul|non conforme|reprendre/i.test(t.label);

interface Props {
  task: TaskModel;
  transitions: AvailableTransition[];
}

export function TransitionButtons({ task, transitions }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [commentModal, setCommentModal] = useState<AvailableTransition | null>(null);
  const [comment, setComment] = useState('');
  const [busyTo, setBusyTo] = useState<string | null>(null);
  // V3 — scan QR : transition en attente du scan, puis code scanné conservé si un commentaire suit.
  const [scanFor, setScanFor] = useState<AvailableTransition | null>(null);
  const [scannedCode, setScannedCode] = useState<string | undefined>();

  const run = async (transition: AvailableTransition, commentText?: string, assetCode?: string) => {
    setBusyTo(transition.to);
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
      await submitTransition(task, { to: transition.to, comment: commentText, lat, lng, assetCode });
      setCommentModal(null);
      setComment('');
      setScannedCode(undefined);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Action impossible pour le moment.');
    } finally {
      setBusyTo(null);
    }
  };

  const onPress = (transition: AvailableTransition) => {
    if (transition.missing.length > 0) {
      Alert.alert(transition.label, `Avant de continuer :\n• ${transition.missing.join('\n• ')}`);
      return;
    }
    if (transition.requiresAssetScan) {
      setScannedCode(undefined);
      setScanFor(transition);
      return;
    }
    if (transition.requiresComment) {
      setComment('');
      setCommentModal(transition);
      return;
    }
    run(transition);
  };

  const onScanned = (code: string) => {
    const transition = scanFor;
    setScanFor(null);
    if (!transition) return;
    // Contrôle local immédiat (hors-ligne) ; le serveur revérifie à la synchronisation.
    if (!checkAssetScan(task.asset?.code, code)) {
      Alert.alert(
        'Équipement différent',
        "Ce QR code ne correspond pas à l'équipement de l'intervention. Vérifiez que vous êtes devant le bon équipement.",
      );
      return;
    }
    if (transition.requiresComment) {
      setScannedCode(code);
      setComment('');
      setCommentModal(transition);
      return;
    }
    run(transition, undefined, code);
  };

  if (transitions.length === 0) return null;

  // Action principale : première transition « vers l'avant » réalisable.
  const primary = transitions.find((t) => !isBackward(t) && t.missing.length === 0) ?? transitions.find((t) => !isBackward(t));

  return (
    <View style={styles.container}>
      {transitions.map((t) => (
        <Button
          key={t.to}
          label={t.label}
          icon={t.missing.length > 0 ? 'lock-outline' : t.requiresAssetScan ? 'qr-code-scanner' : undefined}
          variant={isBackward(t) ? 'danger' : t === primary && t.missing.length === 0 ? 'primary' : 'outline'}
          loading={busyTo === t.to}
          disabled={busyTo !== null && busyTo !== t.to}
          onPress={() => onPress(t)}
        />
      ))}

      <AssetScanModal visible={!!scanFor} asset={task.asset} onScanned={onScanned} onCancel={() => setScanFor(null)} />

      <Modal visible={!!commentModal} transparent animationType="fade" onRequestClose={() => setCommentModal(null)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{commentModal?.label}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Commentaire (obligatoire)"
              placeholderTextColor={colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button label="Annuler" variant="ghost" onPress={() => setCommentModal(null)} disabled={busyTo !== null} style={styles.flex} />
              <Button
                label="Confirmer"
                onPress={() => commentModal && run(commentModal, comment.trim(), scannedCode)}
                disabled={comment.trim().length < 3}
                loading={busyTo !== null}
                style={styles.flex}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { gap: 10 },
    flex: { flex: 1 },
    modalOverlay: { flex: 1, justifyContent: 'center', padding: 24 },
    modalCard: { backgroundColor: c.surface, borderRadius: radius.lg, padding: 20, gap: 12 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    modalInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: 12,
      minHeight: 90,
      textAlignVertical: 'top',
      fontSize: 14,
      color: c.text,
      backgroundColor: c.background,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
  }),
);
