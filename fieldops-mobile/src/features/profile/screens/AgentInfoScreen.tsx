import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Badge, Card, MenuRow } from '../../../components/ui/primitives';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { useSessionStore } from '../../auth/store/session.store';
import { useAgentProfileQuery } from '../hooks/useAgentProfileQuery';
import type { ProfileStackScreenProps } from '../../../navigation/types';

const ACTIVITY_LABEL: Record<string, string> = {
  MAINTENANCE: 'Maintenance',
  LINEN_TRANSPORT: 'Transport de linge',
  CLEANING: 'Nettoyage',
};

export function AgentInfoScreen({ navigation }: ProfileStackScreenProps<'AgentInfo'>) {
  const { colors } = useTheme();
  const styles = useStyles();
  const user = useSessionStore((s) => s.user);
  const { data: agent, isLoading } = useAgentProfileQuery(user?.role === 'AGENT');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mes informations" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.group}>
          <MenuRow icon="person-outline" label="Nom" value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} />
          <View style={styles.separator} />
          <MenuRow icon="mail-outline" label="Email" value={user?.email} />
          {user?.phone ? (
            <>
              <View style={styles.separator} />
              <MenuRow icon="phone" label="Téléphone" value={user.phone} />
            </>
          ) : null}
        </Card>

        {isLoading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}

        {agent ? (
          <>
            <Card style={styles.group}>
              <MenuRow icon="work-outline" label="Activité" value={ACTIVITY_LABEL[agent.activityType] ?? agent.activityType} />
              {agent.vehicle ? (
                <>
                  <View style={styles.separator} />
                  <MenuRow icon="directions-car" label="Véhicule" value={agent.vehicle} />
                </>
              ) : null}
              <View style={styles.separator} />
              <MenuRow icon="star-outline" label="Score qualité" value={agent.qualityScore ? `${Math.round(Number(agent.qualityScore))} / 100` : '—'} />
              <View style={styles.separator} />
              <MenuRow icon="layers" label="Interventions simultanées max." value={String(agent.maxConcurrentTasks)} />
            </Card>

            <Card style={styles.skills}>
              <Text style={styles.skillsTitle}>Compétences</Text>
              <View style={styles.skillsRow}>
                {agent.skills.length ? agent.skills.map((s) => <Badge key={s} label={s} tone="primary" />) : <Text style={styles.muted}>Aucune</Text>}
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
    group: { padding: 0 },
    separator: { height: 1, backgroundColor: c.border, marginLeft: 52 },
    loading: { marginTop: 16 },
    skills: { gap: 10 },
    skillsTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    muted: { color: c.textMuted, fontSize: 13 },
  }),
);
