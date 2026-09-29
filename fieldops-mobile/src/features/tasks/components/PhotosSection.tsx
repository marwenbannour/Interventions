import { withObservables } from '@nozbe/watermelondb/react';
import { Image } from 'expo-image';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../../components/ui/Icon';
import { Card } from '../../../components/ui/primitives';
import { radius } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { observePhotosForTask } from '../../photos/db/photoQueueRepository';
import { photoTypeLabel } from '../utils/statusLabels';
import type { PhotoQueueItem } from '../../photos/db/models/PhotoQueueItem';
import type { Task as TaskModel } from '../db/models/Task';
import type { PhotoType } from '../../../lib/api/types';

function PhotoThumbBase({ item }: { item: PhotoQueueItem }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.thumbWrapper}>
      {item.status === 'uploaded' ? (
        // Le fichier local est supprimé après envoi (photoUploadQueue) : vignette de confirmation.
        <View style={[styles.thumb, styles.uploaded, { backgroundColor: colors.successSoft }]}>
          <Icon name="cloud-done" size={26} color={colors.success} />
          <Text style={[styles.uploadedText, { color: colors.success }]}>Envoyée</Text>
        </View>
      ) : (
        <Image source={{ uri: item.localUri }} style={styles.thumb} contentFit="cover" />
      )}
      {item.status === 'uploading' ? (
        <View style={styles.thumbOverlay}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      ) : null}
      <View style={[styles.state, { backgroundColor: item.status === 'failed' ? colors.danger : item.status === 'uploaded' ? colors.success : colors.warning }]}>
        <Icon name={item.status === 'failed' ? 'error' : item.status === 'uploaded' ? 'check' : 'cloud-upload'} size={12} color="#fff" />
      </View>
    </View>
  );
}

// Même raison que TaskCard : la requête de liste ne suit que l'appartenance à l'ensemble,
// pas les changements de statut d'un item existant.
const PhotoThumb = withObservables(['item'], ({ item }: { item: PhotoQueueItem }) => ({ item }))(PhotoThumbBase);

function AddTile({ onPress, label }: { onPress: () => void; label: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <TouchableOpacity style={styles.addTile} onPress={onPress}>
      <Icon name="add-a-photo" size={22} color={colors.primary} />
      <Text style={styles.addText}>{label}</Text>
    </TouchableOpacity>
  );
}

interface Props {
  task: TaskModel;
  photos: PhotoQueueItem[];
  requiredTypes: PhotoType[];
  requiresSignature: boolean;
  onAddPhoto: (type: PhotoType) => void;
  onSign: () => void;
}

function PhotosSectionBase({ photos, requiredTypes, requiresSignature, onAddPhoto, onSign }: Props) {
  const styles = useStyles();
  const otherPhotos = photos.filter((p) => p.type !== 'SIGNATURE' && !requiredTypes.includes(p.type));

  if (requiredTypes.length === 0 && !requiresSignature && photos.length === 0) return null;

  const row = (items: PhotoQueueItem[], add?: { label: string; onPress: () => void }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
      {items.map((item) => (
        <PhotoThumb key={item.id} item={item} />
      ))}
      {add ? <AddTile label={add.label} onPress={add.onPress} /> : null}
    </ScrollView>
  );

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Photos</Text>

      {requiredTypes.map((type) => (
        <View key={type} style={styles.typeRow}>
          <Text style={styles.typeLabel}>{photoTypeLabel(type)} *</Text>
          {row(photos.filter((p) => p.type === type), { label: 'Ajouter', onPress: () => onAddPhoto(type) })}
        </View>
      ))}

      {requiresSignature ? (
        <View style={styles.typeRow}>
          <Text style={styles.typeLabel}>Signature *</Text>
          {row(photos.filter((p) => p.type === 'SIGNATURE'), { label: 'Signer', onPress: onSign })}
        </View>
      ) : null}

      {otherPhotos.length > 0 ? (
        <View style={styles.typeRow}>
          <Text style={styles.typeLabel}>Autres</Text>
          {row(otherPhotos)}
        </View>
      ) : null}
    </Card>
  );
}

export const PhotosSection = withObservables(['task'], ({ task }: { task: TaskModel }) => ({
  photos: observePhotosForTask(task.serverId),
}))(PhotosSectionBase);

const THUMB = 76;

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    card: { gap: 12 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    typeRow: { gap: 8 },
    typeLabel: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
    thumbRow: { gap: 10 },
    thumbWrapper: { width: THUMB, height: THUMB },
    thumb: { width: THUMB, height: THUMB, borderRadius: radius.md, backgroundColor: c.surfaceAlt },
    uploaded: { alignItems: 'center', justifyContent: 'center', gap: 2 },
    uploadedText: { fontSize: 10, fontWeight: '700' },
    thumbOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius.md,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    state: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#fff',
    },
    addTile: {
      width: THUMB,
      height: THUMB,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: c.primary,
      borderStyle: 'dashed',
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    addText: { fontSize: 11, fontWeight: '600', color: c.primary },
  }),
);
