import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { secureStorage } from '../../../lib/secureStorage';
import { authApi } from '../../auth/api/auth.api';
import { useSessionStore } from '../../auth/store/session.store';
import { disconnectSocket } from '../../../lib/realtime/socket';
import { ChangePasswordCard } from '../../profile/components/ChangePasswordCard';

export function ClientProfileScreen() {
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      const refreshToken = await secureStorage.getRefreshToken();
      if (refreshToken) await authApi.logout({ refreshToken }).catch(() => undefined);
    } finally {
      disconnectSocket();
      await secureStorage.clearRefreshToken().catch(() => undefined);
      clearSession();
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>Client</Text>
      </View>

      <ChangePasswordCard />

      <TouchableOpacity style={styles.button} onPress={logout} disabled={busy}>
        {busy ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Se déconnecter</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, gap: 4, borderWidth: 1, borderColor: colors.border },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted },
  role: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', marginTop: 4 },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
