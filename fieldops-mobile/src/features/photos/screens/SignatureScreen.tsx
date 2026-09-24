import { Directory, File, Paths } from 'expo-file-system';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import SignatureCanvas, { type SignatureViewRef } from 'react-native-signature-canvas';
import { colors } from '../../../theme/colors';
import { enqueuePhoto } from '../db/photoQueueRepository';
import { uploadQueue } from '../services/photoUploadQueue';
import type { TaskStackScreenProps } from '../../../navigation/types';

export function SignatureScreen({ route, navigation }: TaskStackScreenProps<'Signature'>) {
  const { taskId } = route.params;
  const canvasRef = useRef<SignatureViewRef>(null);
  const [signedByName, setSignedByName] = useState('');

  const handleOK = async (dataUri: string) => {
    const base64 = dataUri.replace(/^data:image\/png;base64,/, '');
    const dir = new Directory(Paths.cache, 'photos');
    // idempotent: true — voir PhotoCaptureScreen.tsx (même dossier réutilisé à chaque capture).
    dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, `signature-${Date.now()}.png`);
    dest.write(base64, { encoding: 'base64' });

    await enqueuePhoto({
      taskServerId: taskId,
      localUri: dest.uri,
      type: 'SIGNATURE',
      signedByName: signedByName.trim() || null,
    });
    uploadQueue.processNow();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.nameRow}>
        <Text style={styles.label}>Nom du signataire</Text>
        <TextInput
          style={styles.nameInput}
          value={signedByName}
          onChangeText={setSignedByName}
          placeholder="Nom complet"
        />
      </View>
      <SignatureCanvas
        ref={canvasRef}
        onOK={handleOK}
        descriptionText="Signez ci-dessus"
        webStyle={signatureWebStyle}
      />
      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => canvasRef.current?.clearSignature()}>
          <Text style={styles.secondaryText}>Effacer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => canvasRef.current?.readSignature()}>
          <Text style={styles.primaryText}>Valider</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const signatureWebStyle = `
  .m-signature-pad--footer { display: none; margin: 0; }
  .m-signature-pad { box-shadow: none; border: none; }
  body,html { background-color: #fff; }
`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  nameRow: { padding: 16, gap: 6 },
  label: { fontSize: 13, color: colors.textMuted },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  actions: { flexDirection: 'row', gap: 10, padding: 16 },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: colors.text, fontWeight: '600' },
  primaryButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: colors.primaryText, fontWeight: '600' },
});
