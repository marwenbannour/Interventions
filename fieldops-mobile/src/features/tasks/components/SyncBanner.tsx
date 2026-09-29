import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components/ui/Icon';
import { radius } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { useSyncStatusStore } from '../../sync/store/syncStatus.store';

/** État de la synchronisation hors-ligne (masqué quand tout est à jour). */
export function SyncBanner() {
  const { colors } = useTheme();
  const styles = useStyles();
  const phase = useSyncStatusStore((s) => s.phase);
  const lastError = useSyncStatusStore((s) => s.lastError);

  if (phase === 'idle') return null;
  const label =
    phase === 'syncing'
      ? 'Synchronisation…'
      : phase === 'offline'
        ? 'Hors ligne — données locales, envoi à la reconnexion'
        : `Erreur de synchronisation : ${lastError ?? ''}`;
  const color = phase === 'error' ? colors.danger : phase === 'offline' ? colors.warning : colors.primary;
  const icon = phase === 'syncing' ? 'sync' : phase === 'offline' ? 'cloud-off' : 'error-outline';

  return (
    <View style={[styles.banner, { borderColor: color }]}>
      <Icon name={icon} size={16} color={color} />
      <Text style={[styles.text, { color }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.md,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    text: { flex: 1, fontSize: 12, fontWeight: '600' },
  }),
);
