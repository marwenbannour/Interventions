import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../../components/ui/Avatar';
import { Icon } from '../../../components/ui/Icon';
import { Button, Card, MenuRow } from '../../../components/ui/primitives';
import { radius } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { useSessionStore } from '../../auth/store/session.store';
import { useDutyStore } from '../../agents/store/duty.store';
import { toggleDuty } from '../../agents/actions/dutyActions';
import { logout } from '../actions/logout';
import type { ProfileStackScreenProps } from '../../../navigation/types';

const ROLE_LABEL: Record<string, string> = {
  AGENT: "Agent d'intervention",
  SUPERVISOR: 'Superviseur',
  ADMIN: 'Administrateur',
  DIRECTION: 'Direction',
  CLIENT: 'Client',
};

export function ProfileScreen({ navigation }: ProfileStackScreenProps<'ProfileHome'>) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const user = useSessionStore((s) => s.user);
  const isOnDuty = useDutyStore((s) => s.isOnDuty);
  const agentStatus = useDutyStore((s) => s.status);
  const [busy, setBusy] = useState<'logout' | 'logout-all' | null>(null);
  const [dutyBusy, setDutyBusy] = useState(false);

  const onToggleDuty = async (next: boolean) => {
    setDutyBusy(true);
    try {
      await toggleDuty(next);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Changement de service impossible.');
    } finally {
      setDutyBusy(false);
    }
  };

  const doLogout = async (all: boolean) => {
    setBusy(all ? 'logout-all' : 'logout');
    try {
      await logout(all);
    } finally {
      setBusy(null);
    }
  };

  const confirmLogoutAll = () =>
    Alert.alert('Déconnexion globale', 'Cela déconnectera tous vos appareils. Continuer ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', style: 'destructive', onPress: () => doLogout(true) },
    ]);

  const dutyLocked = agentStatus !== null && agentStatus !== 'ACTIVE';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
        <Avatar firstName={user?.firstName} lastName={user?.lastName} size={84} inverted />
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.role}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Text>
        <View style={styles.statusChip}>
          <View style={[styles.statusDot, { backgroundColor: isOnDuty ? colors.success : '#CBD5E1' }]} />
          <Text style={styles.statusText}>{isOnDuty ? 'En service' : 'Hors service'}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Card style={styles.dutyCard}>
          <Icon name="work-outline" size={22} color={colors.text} />
          <View style={styles.dutyTexts}>
            <Text style={styles.dutyLabel}>En service</Text>
            <Text style={styles.dutyHint}>
              {dutyLocked ? `Profil ${agentStatus === 'SUSPENDED' ? 'suspendu' : 'en attente de validation'}` : 'Active le suivi de position pour le dispatch'}
            </Text>
          </View>
          {dutyBusy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={isOnDuty}
              onValueChange={onToggleDuty}
              disabled={dutyLocked}
              trackColor={{ true: colors.success, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          )}
        </Card>

        <Card style={styles.menu}>
          <MenuRow icon="person-outline" label="Mes informations" onPress={() => navigation.navigate('AgentInfo')} />
          <View style={styles.separator} />
          <MenuRow icon="event-note" label="Mes interventions" onPress={() => navigation.navigate('Tasks', { screen: 'TaskList' })} />
          <View style={styles.separator} />
          <MenuRow icon="bar-chart" label="Statistiques" onPress={() => navigation.navigate('Home')} />
          <View style={styles.separator} />
          <MenuRow icon="settings" label="Paramètres" onPress={() => navigation.navigate('Settings')} />
        </Card>

        <Button label="Déconnexion" icon="logout" variant="danger" loading={busy === 'logout'} disabled={busy !== null} onPress={() => doLogout(false)} />
        <TouchableOpacity onPress={confirmLogoutAll} disabled={busy !== null} style={styles.logoutAll}>
          {busy === 'logout-all' ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={styles.logoutAllText}>Déconnexion de tous les appareils</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingBottom: 32 },
    hero: {
      backgroundColor: c.primary,
      alignItems: 'center',
      paddingBottom: 36,
      borderBottomLeftRadius: radius.xl + 8,
      borderBottomRightRadius: radius.xl + 8,
      gap: 4,
    },
    name: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 10 },
    role: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 5,
      marginTop: 8,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    body: { padding: 16, gap: 14, marginTop: -20 },
    dutyCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    dutyTexts: { flex: 1 },
    dutyLabel: { fontSize: 15, fontWeight: '600', color: c.text },
    dutyHint: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    menu: { padding: 0 },
    separator: { height: 1, backgroundColor: c.border, marginLeft: 52 },
    logoutAll: { alignItems: 'center', paddingVertical: 6 },
    logoutAllText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
  }),
);
