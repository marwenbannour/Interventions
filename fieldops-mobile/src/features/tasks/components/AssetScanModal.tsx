import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/primitives';
import { radius } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
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
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
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
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={cancel} hitSlop={10}>
            <Icon name="close" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Scanner l&apos;équipement</Text>
          <View style={{ width: 26 }} />
        </View>
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
            <Icon name="no-photography" size={40} color={colors.textMuted} />
            <Text style={styles.subtitle}>L&apos;accès à la caméra est nécessaire pour scanner le QR code.</Text>
            {permission.canAskAgain ? <Button label="Autoriser la caméra" onPress={requestPermission} /> : null}
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
              placeholderTextColor={colors.textMuted}
            />
            <Button
              label="Valider"
              disabled={code.trim().length < 3}
              onPress={() => {
                onScanned(code.trim());
                reset();
              }}
            />
          </View>
        ) : (
          <TouchableOpacity onPress={() => setManual(true)} style={styles.link}>
            <Icon name="keyboard" size={18} color={colors.primary} />
            <Text style={styles.linkText}>Étiquette illisible ? Saisir le code</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingHorizontal: 20, gap: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 14, color: c.textMuted, textAlign: 'center' },
    cameraFrame: { aspectRatio: 1, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#000' },
    camera: { flex: 1 },
    reticle: {
      position: 'absolute',
      top: '20%',
      left: '20%',
      width: '60%',
      height: '60%',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      borderRadius: radius.lg,
    },
    permissionBox: { gap: 12, alignItems: 'center', paddingVertical: 24 },
    manualBox: { gap: 10 },
    label: { fontSize: 13, color: c.textMuted },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: 12,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.surface,
      letterSpacing: 1,
    },
    link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
    linkText: { color: c.primary, fontSize: 14, fontWeight: '600' },
  }),
);
