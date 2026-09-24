import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { secureStorage } from '../../../lib/secureStorage';
import { resetDatabase } from '../../../lib/db/database';
import { authApi } from '../../auth/api/auth.api';
import { useSessionStore } from '../../auth/store/session.store';
import { useDutyStore } from '../../agents/store/duty.store';
import { toggleDuty } from '../../agents/actions/dutyActions';
import { stopBackgroundLocation } from '../../location/services/backgroundLocation';
import { unregisterPushToken } from '../../notifications/services/pushRegistration';
import { disconnectSocket } from '../../../lib/realtime/socket';
import { ChangePasswordCard } from '../components/ChangePasswordCard';
import { useAgentProfileQuery } from '../hooks/useAgentProfileQuery';

export function ProfileScreen() {
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);
  const isOnDuty = useDutyStore((s) => s.isOnDuty);
  const agentStatus = useDutyStore((s) => s.status);
  const { data: agentProfile } = useAgentProfileQuery(user?.role === 'AGENT');
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

  const logout = async () => {
    setBusy('logout');
    try {
      const refreshToken = await secureStorage.getRefreshToken();
      if (refreshToken) await authApi.logout({ refreshToken }).catch(() => undefined);
    } finally {
      await stopBackgroundLocation().catch(() => undefined);
      await unregisterPushToken().catch(() => undefined);
      disconnectSocket();
      await secureStorage.clearRefreshToken().catch(() => undefined);
      clearSession();
      await resetDatabase().catch(() => undefined);
      setBusy(null);
    }
  };

  const logoutAll = async () => {
    setBusy('logout-all');
    try {
      await authApi.logoutAll().catch(() => undefined);
    } finally {
      await stopBackgroundLocation().catch(() => undefined);
      await unregisterPushToken().catch(() => undefined);
      disconnectSocket();
      await secureStorage.clearRefreshToken().catch(() => undefined);
      clearSession();
      await resetDatabase().catch(() => undefined);
      setBusy(null);
    }
  };

  const confirmLogoutAll = () => {
    Alert.alert(
      'Déconnexion globale',
      'Cela déconnectera tous vos appareils. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: logoutAll },
      ],
    );
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.dutyRow}>
          <View>
            <Text style={styles.dutyLabel}>En service</Text>
            {agentStatus && agentStatus !== 'ACTIVE' && <Text style={styles.dutyHint}>Profil {agentStatus}</Text>}
          </View>
          {dutyBusy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={isOnDuty}
              onValueChange={onToggleDuty}
              disabled={agentStatus !== null && agentStatus !== 'ACTIVE'}
            />
          )}
        </View>
      </View>

      {agentProfile && (
        <View style={styles.card}>
          {agentProfile.vehicle ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Véhicule</Text>
              <Text style={styles.infoValue}>{agentProfile.vehicle}</Text>
            </View>
          ) : null}
          {agentProfile.qualityScore ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Score qualité</Text>
              <Text style={styles.infoValue}>{agentProfile.qualityScore}</Text>
            </View>
          ) : null}
          {agentProfile.skills.length > 0 ? (
            <View style={styles.skillsBlock}>
              <Text style={styles.infoLabel}>Compétences</Text>
              <View style={styles.skillsRow}>
                {agentProfile.skills.map((skill) => (
                  <View key={skill} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}

      <ChangePasswordCard />

      <TouchableOpacity style={styles.button} onPress={logout} disabled={busy !== null}>
        {busy === 'logout' ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Se déconnecter</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.dangerButton} onPress={confirmLogoutAll} disabled={busy !== null}>
        {busy === 'logout-all' ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <Text style={styles.dangerButtonText}>Déconnexion de tous les appareils</Text>
        )}
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, gap: 4, borderWidth: 1, borderColor: colors.border },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted },
  role: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', marginTop: 4 },
  dutyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dutyLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  dutyHint: { fontSize: 12, color: colors.warning, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 13, color: colors.text, fontWeight: '600' },
  skillsBlock: { paddingTop: 4, gap: 6 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { backgroundColor: colors.background, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  skillChipText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  dangerButton: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  dangerButtonText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
