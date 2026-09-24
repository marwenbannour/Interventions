import { CameraView, useCameraPermissions } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
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
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>FieldOps a besoin d’accéder à la caméra.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.overlay}>
        <Text style={styles.typeLabel}>{PHOTO_TYPE_LABEL[type] ?? type}</Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={capturing}>
          <Text style={styles.cancelText}>Annuler</Text>
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
  overlay: { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  typeLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  controls: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  cancelButton: { width: 70 },
  cancelText: { color: '#fff', fontSize: 15 },
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
  permissionContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  permissionText: { fontSize: 15, color: colors.text, textAlign: 'center' },
  permissionButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  permissionButtonText: { color: colors.primaryText, fontWeight: '600' },
});
