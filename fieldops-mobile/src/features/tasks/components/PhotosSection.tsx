import { withObservables } from '@nozbe/watermelondb/react';
import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { observePhotosForTask } from '../../photos/db/photoQueueRepository';
import { photoTypeLabel } from '../utils/statusLabels';
import type { PhotoQueueItem } from '../../photos/db/models/PhotoQueueItem';
import type { Task as TaskModel } from '../db/models/Task';
import type { PhotoType } from '../../../lib/api/types';

function PhotoThumbBase({ item }: { item: PhotoQueueItem }) {
  return (
    <View style={styles.thumbWrapper}>
      {item.status === 'uploaded' ? (
        <View style={[styles.thumb, styles.thumbUploaded]}>
          <Text style={styles.thumbCheck}>✓</Text>
        </View>
      ) : (
        <Image source={{ uri: item.localUri }} style={styles.thumb} contentFit="cover" />
      )}
      {item.status === 'uploading' && (
        <View style={styles.thumbOverlay}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
      {item.status === 'failed' && <Text style={styles.thumbError}>échec</Text>}
    </View>
  );
}

// Même raison que TaskRow (TaskListScreen) : la requête de liste ne suit que
// l'appartenance à l'ensemble, pas les changements de statut d'un item existant.
const enhanceThumb = withObservables(['item'], ({ item }: { item: PhotoQueueItem }) => ({ item }));
const PhotoThumb = enhanceThumb(PhotoThumbBase);

interface Props {
  task: TaskModel;
  photos: PhotoQueueItem[];
  requiredTypes: PhotoType[];
  requiresSignature: boolean;
  onAddPhoto: (type: PhotoType) => void;
  onSign: () => void;
}

function PhotosSectionBase({ photos, requiredTypes, requiresSignature, onAddPhoto, onSign }: Props) {
  const otherPhotos = photos.filter((p) => p.type !== 'SIGNATURE' && !requiredTypes.includes(p.type));

  if (requiredTypes.length === 0 && !requiresSignature && photos.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Photos</Text>

      {requiredTypes.map((type) => (
        <View key={type} style={styles.typeRow}>
          <Text style={styles.typeLabel}>{photoTypeLabel(type)} *</Text>
          <View style={styles.thumbRow}>
            {photos.filter((p) => p.type === type).map((item) => (
              <PhotoThumb key={item.id} item={item} />
            ))}
            <TouchableOpacity style={styles.addButton} onPress={() => onAddPhoto(type)}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {requiresSignature && (
        <View style={styles.typeRow}>
          <Text style={styles.typeLabel}>Signature *</Text>
          <View style={styles.thumbRow}>
            {photos.filter((p) => p.type === 'SIGNATURE').map((item) => (
              <PhotoThumb key={item.id} item={item} />
            ))}
            <TouchableOpacity style={styles.addButton} onPress={onSign}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {otherPhotos.length > 0 && (
        <View style={styles.typeRow}>
          <Text style={styles.typeLabel}>Autres</Text>
          <View style={styles.thumbRow}>
            {otherPhotos.map((item) => (
              <PhotoThumb key={item.id} item={item} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const enhance = withObservables(['task'], ({ task }: { task: TaskModel }) => ({
  photos: observePhotosForTask(task.serverId),
}));

export const PhotosSection = enhance(PhotosSectionBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  typeRow: { gap: 6 },
  typeLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrapper: { position: 'relative' },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.background },
  thumbUploaded: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#DCFCE7' },
  thumbCheck: { color: colors.success, fontSize: 22, fontWeight: '700' },
  thumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbError: { fontSize: 10, color: colors.danger, position: 'absolute', bottom: -14, left: 0 },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 26, color: colors.textMuted, lineHeight: 28 },
});
