import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { HeaderIconButton, ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Badge, Card, EmptyState, IconBubble } from '../../../components/ui/primitives';
import { database } from '../../../lib/db/database';
import { toneColors } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { useSessionStore } from '../../auth/store/session.store';
import { LeafletMap } from '../../map/components/LeafletMap';
import { taskPosition } from '../../map/utils/geo';
import { ChecklistCard } from '../components/ChecklistCard';
import { HistorySection } from '../components/HistorySection';
import { NotesSection } from '../components/NotesSection';
import { PhotosSection } from '../components/PhotosSection';
import { TransitionButtons } from '../components/TransitionButtons';
import { useAvailableTransitions } from '../hooks/useAvailableTransitions';
import { originLabel, priorityLabel, statusLabel } from '../utils/statusLabels';
import { formatWhen, priorityTone, statusTone, taskTypeIcon } from '../utils/taskVisuals';
import type { Task as TaskModel } from '../db/models/Task';
import type { PhotoType } from '../../../lib/api/types';
import type { TaskStackScreenProps } from '../../../navigation/types';

function InfoLine({ icon, text, sub }: { icon: IconName; text: string; sub?: string | null }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.infoLine}>
      <Icon name={icon} size={18} color={colors.textMuted} />
      <View style={styles.infoTexts}>
        <Text style={styles.infoText}>{text}</Text>
        {sub ? <Text style={styles.infoSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

interface Props extends TaskStackScreenProps<'TaskDetail'> {
  task: TaskModel | undefined;
}

function TaskDetailScreenBase({ task, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const user = useSessionStore((s) => s.user);
  const transitions = useAvailableTransitions(task);
  const requiredTypes = [...new Set(transitions.flatMap((t) => t.requiredPhotos))] as PhotoType[];
  const requiresSignature = transitions.some((t) => t.requiresSignature);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TaskList'));

  if (!task) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Détail intervention" onBack={goBack} />
        <EmptyState icon="search-off" title="Intervention introuvable localement." hint="Synchronisez pour la récupérer." />
      </View>
    );
  }

  const site = task.site;
  const position = taskPosition(task);
  const agentName = task.agentId && task.agentId === user?.id ? `${user.firstName} ${user.lastName}` : task.agentId ? 'Autre agent' : 'Non affectée';
  const showOnMap = () => navigation.navigate('Map', { focusTaskId: task.serverId });

  const openMenu = () => {
    const actions: { text: string; onPress?: () => void; style?: 'cancel' }[] = [];
    if (position) actions.push({ text: 'Voir sur la carte', onPress: showOnMap });
    if (position)
      actions.push({
        text: 'Itinéraire',
        onPress: () => Linking.openURL(`geo:${position.lat},${position.lng}?q=${position.lat},${position.lng}(${encodeURIComponent(site?.name ?? '')})`),
      });
    if (site?.contactPhone) actions.push({ text: `Appeler ${site.contactName ?? 'le contact'}`, onPress: () => Linking.openURL(`tel:${site.contactPhone}`) });
    actions.push({ text: 'Fermer', style: 'cancel' });
    Alert.alert(`#${task.reference}`, task.title, actions);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Détail intervention" onBack={goBack} right={<HeaderIconButton icon="more-vert" onPress={openMenu} />} />
      <ScrollView contentContainerStyle={styles.content}>
        {task.localStatus === 'pending' ? (
          <View style={[styles.pending, { backgroundColor: toneColors(colors, 'warning').bg }]}>
            <Icon name="cloud-upload" size={16} color={colors.warning} />
            <Text style={[styles.pendingText, { color: colors.warning }]}>Modifications en attente de synchronisation</Text>
          </View>
        ) : null}

        <Card style={styles.summary}>
          <View style={styles.summaryTop}>
            <IconBubble name={taskTypeIcon(task.type)} tone={priorityTone(task.priority)} size={36} />
            <Text style={styles.reference}>#{task.reference}</Text>
            <Badge label={priorityLabel(task.priority)} tone={priorityTone(task.priority)} solid />
          </View>
          <Text style={styles.title}>{task.title}</Text>
          <View style={styles.badges}>
            <Badge label={statusLabel(task.status)} tone={statusTone(task.status)} />
            {originLabel(task.origin) ? <Badge label={originLabel(task.origin) as string} tone="muted" /> : null}
            {task.isRework ? <Badge label="Réintervention" tone="danger" /> : null}
          </View>
          <View style={styles.lines}>
            <InfoLine icon="place" text={site?.name ?? '—'} sub={site?.address} />
            <InfoLine icon="event" text={formatWhen(task.scheduledStart)} />
            <InfoLine icon="person-outline" text={`Agent : ${agentName}`} />
            <InfoLine icon="business" text={task.client?.name ?? '—'} />
          </View>
        </Card>

        {task.description ? (
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>Description</Text>
            <Text style={styles.body}>{task.description}</Text>
          </Card>
        ) : null}

        {position ? (
          <Card style={styles.mapCard}>
            <LeafletMap
              interactive={false}
              style={styles.miniMap}
              markers={[
                {
                  id: task.serverId,
                  lat: position.lat,
                  lng: position.lng,
                  color: toneColors(colors, priorityTone(task.priority)).fg,
                  title: task.reference,
                },
              ]}
            />
            <TouchableOpacity style={styles.mapLink} onPress={showOnMap}>
              <Icon name="map" size={18} color={colors.primary} />
              <Text style={styles.mapLinkText}>Voir sur la carte</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {task.asset ? (
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>Équipement</Text>
            <InfoLine icon="precision-manufacturing" text={task.asset.name} sub={task.asset.location} />
            {task.asset.brand || task.asset.model ? (
              <InfoLine icon="info-outline" text={[task.asset.brand, task.asset.model].filter(Boolean).join(' · ')} sub={task.asset.serialNumber ? `N° ${task.asset.serialNumber}` : null} />
            ) : null}
            {transitions.some((t) => t.requiresAssetScan) ? (
              <View style={[styles.hint, { backgroundColor: colors.primarySoft }]}>
                <Icon name="qr-code-scanner" size={18} color={colors.primary} />
                <Text style={[styles.hintText, { color: colors.primary }]}>Le QR code de l&apos;équipement sera demandé pour démarrer.</Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {site?.contactName || site?.contactPhone || site?.accessInstructions ? (
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>Contact sur site</Text>
            {site.contactName ? <InfoLine icon="badge" text={site.contactName} /> : null}
            {site.contactPhone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${site.contactPhone}`)}>
                <InfoLine icon="call" text={site.contactPhone} />
              </TouchableOpacity>
            ) : null}
            {site.accessInstructions ? <InfoLine icon="vpn-key" text={site.accessInstructions} /> : null}
          </Card>
        ) : null}

        <ChecklistCard task={task} />

        <PhotosSection
          task={task}
          requiredTypes={requiredTypes}
          requiresSignature={requiresSignature}
          onAddPhoto={(type: PhotoType) => navigation.navigate('PhotoCapture', { taskId: task.serverId, type })}
          onSign={() => navigation.navigate('Signature', { taskId: task.serverId })}
        />

        <TransitionButtons task={task} transitions={transitions} />

        <NotesSection task={task} />

        <HistorySection task={task} />

        {task.completionNotes ? (
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>Notes de clôture</Text>
            <Text style={styles.body}>{task.completionNotes}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

// Query.observe() ne suit que l'appartenance à l'ensemble (ajout/retrait de lignes),
// PAS les changements de champs d'un enregistrement déjà présent (avertissement explicite
// de l'API WatermelonDB). switchMap vers Model.observe() une fois la ligne trouvée est le
// pattern correct pour une vue détail réactive à TOUS les changements de champs.
const enhance = withObservables(['route'], ({ route }: TaskStackScreenProps<'TaskDetail'>) => ({
  task: database.collections
    .get<TaskModel>('tasks')
    .query(Q.where('server_id', route.params.taskId))
    .observe()
    .pipe(switchMap((records) => (records[0] ? records[0].observe() : of(undefined)))),
}));

export const TaskDetailScreen = enhance(TaskDetailScreenBase);

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
    pending: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
    pendingText: { fontSize: 13, fontWeight: '600' },
    summary: { gap: 10 },
    summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reference: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text },
    title: { fontSize: 20, fontWeight: '700', color: c.text },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    lines: { gap: 10, marginTop: 4 },
    infoLine: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    infoTexts: { flex: 1 },
    infoText: { fontSize: 14, color: c.text },
    infoSub: { fontSize: 12, color: c.textMuted, marginTop: 1 },
    block: { gap: 10 },
    blockTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    body: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
    mapCard: { padding: 0, overflow: 'hidden' },
    miniMap: { height: 150 },
    mapLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
    mapLinkText: { fontSize: 14, fontWeight: '600', color: c.primary },
    hint: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10 },
    hintText: { flex: 1, fontSize: 12, fontWeight: '600' },
  }),
);
