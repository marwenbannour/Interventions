import { Directory, File, Paths } from 'expo-file-system';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SignatureCanvas, { type SignatureViewRef } from 'react-native-signature-canvas';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Button, Field } from '../../../components/ui/primitives';
import { radius } from '../../../theme/palette';
import { makeStyles } from '../../../theme/ThemeProvider';
import { enqueuePhoto } from '../db/photoQueueRepository';
import { uploadQueue } from '../services/photoUploadQueue';
import type { TaskStackScreenProps } from '../../../navigation/types';

export function SignatureScreen({ route, navigation }: TaskStackScreenProps<'Signature'>) {
  const { taskId } = route.params;
  const insets = useSafeAreaInsets();
  const styles = useStyles();
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
      <ScreenHeader title="Signature du client" onBack={() => navigation.goBack()} />
      <View style={styles.name}>
        <Field icon="person-outline" value={signedByName} onChangeText={setSignedByName} placeholder="Nom du signataire" />
      </View>
      <View style={styles.pad}>
        {/* La zone de signature reste blanche, y compris en mode sombre (rendu fidèle au PDF). */}
        <SignatureCanvas ref={canvasRef} onOK={handleOK} descriptionText="Signez ci-dessus" webStyle={signatureWebStyle} />
      </View>
      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Button label="Effacer" icon="backspace" variant="outline" onPress={() => canvasRef.current?.clearSignature()} style={styles.flex} />
        <Button label="Valider" icon="check" onPress={() => canvasRef.current?.readSignature()} style={styles.flex} />
      </View>
    </View>
  );
}

const signatureWebStyle = `
  .m-signature-pad--footer { display: none; margin: 0; }
  .m-signature-pad { box-shadow: none; border: none; }
  body,html { background-color: #fff; }
`;

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    name: { paddingHorizontal: 16, paddingBottom: 12 },
    pad: { flex: 1, marginHorizontal: 16, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
    actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
    flex: { flex: 1 },
  }),
);
