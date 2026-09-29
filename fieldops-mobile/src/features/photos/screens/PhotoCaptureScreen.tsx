import { CameraView, useCameraPermissions } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/ui/Icon';
import { Button, EmptyState } from '../../../components/ui/primitives';
import { useTheme } from '../../../theme/ThemeProvider';
import { enqueuePhoto } from '../db/photoQueueRepository';
import { uploadQueue } from '../services/photoUploadQueue';
import type { TaskStackScreenProps } from '../../../navigation/types';

const PHOTO_TYPE_LABEL: Record<string, string> = {
  BEFORE: 'Photo « avant »',
  AFTER: 'Photo « après »',
  PROOF: 'Preuve de livraison',
  DOCUMENT: 'Document',
  ANOMALY: 'Anomalie',
};

async function getTagPosition(): Promise<{ lat: number; lng: number; accuracy: number | null } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
  if (!last) return null;
  return { lat: last.coords.latitude, lng: last.coords.longitude, accuracy: last.coords.accuracy };
}

export function PhotoCaptureScreen({ route, navigation }: TaskStackScreenProps<'PhotoCapture'>) {
  const { taskId, type } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);

  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo) throw new Error('Capture échouée');

      const dir = new Directory(Paths.cache, 'photos');
      // idempotent: true — la même Directory est réutilisée à chaque capture ; sans ce
      // flag, create() lève une erreur dès le deuxième appel ("already exists").
      dir.create({ intermediates: true, idempotent: true });
      const dest = new File(dir, `${Date.now()}.jpg`);
      await new File(photo.uri).copy(dest);

      const position = await getTagPosition();

      await enqueuePhoto({
        taskServerId: taskId,
        localUri: dest.uri,
        type,
        lat: position?.lat,
        lng: position?.lng,
        accuracy: position?.accuracy,
      });

      uploadQueue.processNow();
      navigation.goBack();
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <EmptyState icon="no-photography" title="FieldOps a besoin d’accéder à la caméra." />
        <Button label="Autoriser la caméra" icon="photo-camera" onPress={requestPermission} />
        <Button label="Annuler" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={[styles.overlay, { top: insets.top + 16 }]}>
        <Icon name="photo-camera" size={16} color="#fff" />
        <Text style={styles.typeLabel}>{PHOTO_TYPE_LABEL[type] ?? type}</Text>
      </View>
      <View style={[styles.controls, { bottom: insets.bottom + 32 }]}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={capturing}>
          <Icon name="close" size={30} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shutterButton} onPress={capture} disabled={capturing}>
          {capturing ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
        </TouchableOpacity>
        <View style={styles.cancelButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  cancelButton: { width: 70 },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  permissionContainer: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
});
