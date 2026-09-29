import { withObservables } from '@nozbe/watermelondb/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../../components/ui/Icon';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { EmptyState } from '../../../components/ui/primitives';
import { database } from '../../../lib/db/database';
import { toneColors } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { TaskCard } from '../../tasks/components/TaskCard';
import { priorityTone, statusGroup } from '../../tasks/utils/taskVisuals';
import { LeafletMap, type LeafletMapHandle, type MapMarker } from '../components/LeafletMap';
import { currentPosition, distanceKm, taskPosition, type LatLng } from '../utils/geo';
import type { Task as TaskModel } from '../../tasks/db/models/Task';
import type { AppTabScreenProps } from '../../../navigation/types';

type Props = AppTabScreenProps<'Map'> & { tasks: TaskModel[] };

function MapScreenBase({ tasks, navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const map = useRef<LeafletMapHandle>(null);
  const [me, setMe] = useState<LatLng | null>(null);
  const focusTaskId = route.params?.focusTaskId;

  useEffect(() => {
    currentPosition().then(setMe).catch(() => undefined);
  }, []);

  // Interventions à traiter (nouvelles ou en cours) qui ont une position de site.
  const located = useMemo(
    () =>
      tasks
        .filter((t) => ['new', 'active'].includes(statusGroup(t.status)))
        .map((t) => ({ task: t, pos: taskPosition(t) }))
        .filter((x): x is { task: TaskModel; pos: LatLng } => x.pos !== null),
    [tasks],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      located.map(({ task, pos }) => ({
        id: task.serverId,
        lat: pos.lat,
        lng: pos.lng,
        color: toneColors(colors, priorityTone(task.priority)).fg,
        title: `#${task.reference}`,
        subtitle: `${task.title} — ${task.site?.name ?? ''}`,
      })),
    [located, colors],
  );

  const nearby = useMemo(
    () =>
      located
        .map(({ task, pos }) => ({ task, distance: me ? distanceKm(me, pos) : null }))
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)),
    [located, me],
  );

  const openTask = (taskId: string) => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId }, initial: false });

  const locate = async () => {
    const pos = await currentPosition();
    if (pos) {
      setMe(pos);
      map.current?.centerOn(pos.lat, pos.lng, 14);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Carte des interventions" />
      <View style={styles.mapWrap}>
        <LeafletMap ref={map} markers={markers} user={me} focusId={focusTaskId} style={styles.map} onMarkerPress={openTask} />
        <TouchableOpacity style={styles.locate} onPress={locate}>
          <Icon name="my-location" size={22} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={nearby}
        keyExtractor={(item) => item.task.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.listTitle}>Interventions à proximité</Text>}
        renderItem={({ item }) => (
          <TaskCard task={item.task} distanceKm={item.distance} compact onPress={() => openTask(item.task.serverId)} />
        )}
        ListEmptyComponent={<EmptyState icon="location-off" title="Aucune intervention localisée à traiter" />}
      />
    </View>
  );
}

const enhance = withObservables([], () => ({
  tasks: database.collections.get<TaskModel>('tasks').query().observe(),
}));

export const MapScreen = enhance(MapScreenBase);

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    mapWrap: { height: '48%', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
    map: { flex: 1 },
    locate: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
    list: { padding: 16, gap: 10 },
    listTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 2 },
  }),
);
