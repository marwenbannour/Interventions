import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { secureStorage } from '../../../lib/secureStorage';
import { ApiError } from '../../../lib/api/errors';
import { authApi } from '../api/auth.api';
import { useSessionStore } from '../store/session.store';
import type { AuthStackScreenProps } from '../../../navigation/types';

const CHANNEL_LABEL: Record<'EMAIL' | 'SMS', string> = {
  EMAIL: 'e-mail',
  SMS: 'SMS',
};

export function OtpScreen({ route }: AuthStackScreenProps<'Otp'>) {
  const { mfaToken, channel } = route.params;
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useSessionStore((s) => s.setSession);

  const onSubmit = async () => {
    if (code.length !== 6) {
      setError('Le code doit comporter 6 chiffres');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await authApi.verifyOtp({ mfaToken, code });
      await secureStorage.setRefreshToken(response.refreshToken);
      setSession(response.accessToken, response.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connexion impossible. Vérifiez le réseau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vérification</Text>
      <Text style={styles.subtitle}>
        Un code à 6 chiffres a été envoyé par {CHANNEL_LABEL[channel]}.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
        editable={!submitting}
        autoFocus
      />
      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Valider</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.primaryText, fontSize: 16, fontWeight: '600' },
});
