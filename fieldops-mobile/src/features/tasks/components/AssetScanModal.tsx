import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import type { AssetSnapshot } from '../../../lib/api/types';

interface Props {
  visible: boolean;
  asset: AssetSnapshot | null;
  onScanned: (code: string) => void;
  onCancel: () => void;
}

/**
 * V3 — scan du QR de l'équipement (condition ASSET_SCAN). Le code attendu n'est volontairement
 * pas affiché : la saisie manuelle (étiquette abîmée) exige de lire l'étiquette physique, et le
 * serveur trace le mode de saisie (QR ou manuel) dans l'historique.
 */
export function AssetScanModal({ visible, asset, onScanned, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  // onBarcodeScanned est appelé en rafale tant que le QR est dans le champ : on ne garde que le premier.
  const handled = useRef(false);

  const reset = () => {
    handled.current = false;
    setManual(false);
    setCode('');
  };

  const onBarcode = (result: BarcodeScanningResult) => {
    if (handled.current || !result.data) return;
    handled.current = true;
    onScanned(result.data);
    reset();
  };

  const cancel = () => {
    reset();
    onCancel();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cancel} onShow={() => (handled.current = false)}>
      <View style={styles.container}>
        <Text style={styles.title}>Scanner l&apos;équipement</Text>
        {asset ? (
          <Text style={styles.subtitle}>
            {asset.name}
            {asset.location ? `\n${asset.location}` : ''}
          </Text>
        ) : null}

        {!manual && permission?.granted ? (
          <View style={styles.cameraFrame}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={visible ? onBarcode : undefined}
            />
            <View pointerEvents="none" style={styles.reticle} />
          </View>
        ) : null}

        {!manual && permission && !permission.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.subtitle}>L&apos;accès à la caméra est nécessaire pour scanner le QR code.</Text>
            {permission.canAskAgain ? (
              <TouchableOpacity style={styles.primary} onPress={requestPermission}>
                <Text style={styles.primaryText}>Autoriser la caméra</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {manual ? (
          <View style={styles.manualBox}>
            <Text style={styles.label}>Code imprimé sous le QR (ex. EQ-000123)</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              placeholder="EQ-…"
            />
            <TouchableOpacity
              style={[styles.primary, code.trim().length < 3 && styles.disabled]}
              disabled={code.trim().length < 3}
              onPress={() => {
                onScanned(code.trim());
                reset();
              }}
            >
              <Text style={styles.primaryText}>Valider</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setManual(true)} style={styles.link}>
            <Text style={styles.linkText}>Étiquette illisible ? Saisir le code</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={cancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60, gap: 16 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  cameraFrame: { aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  camera: { flex: 1 },
  reticle: {
    position: 'absolute', top: '20%', left: '20%', width: '60%', height: '60%',
    borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 16,
  },
  permissionBox: { gap: 12, alignItems: 'center', paddingVertical: 24 },
  manualBox: { gap: 10 },
  label: { fontSize: 13, color: colors.textMuted },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16,
    color: colors.text, backgroundColor: colors.surface, letterSpacing: 1,
  },
  primary: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', paddingHorizontal: 18 },
  primaryText: { color: colors.primaryText, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  cancel: { alignItems: 'center', paddingVertical: 10, marginTop: 'auto' },
  cancelText: { color: colors.textMuted, fontSize: 15 },
});
