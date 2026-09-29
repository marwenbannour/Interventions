import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, IconBubble } from '../../../components/ui/primitives';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { radius } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { secureStorage } from '../../../lib/secureStorage';
import { ApiError } from '../../../lib/api/errors';
import { authApi } from '../api/auth.api';
import { useSessionStore } from '../store/session.store';
import type { AuthStackScreenProps } from '../../../navigation/types';

const CHANNEL_LABEL: Record<'EMAIL' | 'SMS', string> = {
  EMAIL: 'e-mail',
  SMS: 'SMS',
};

export function OtpScreen({ route, navigation }: AuthStackScreenProps<'Otp'>) {
  const { mfaToken, channel } = route.params;
  const { colors } = useTheme();
  const styles = useStyles();
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
      <ScreenHeader title="Vérification" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <View style={styles.center}>
          <IconBubble name="verified-user" tone="primary" size={72} />
        </View>
        <Text style={styles.subtitle}>Un code à 6 chiffres a été envoyé par {CHANNEL_LABEL[channel]}.</Text>
        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
          editable={!submitting}
          autoFocus
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Valider" onPress={onSubmit} loading={submitting} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 16 },
    center: { alignItems: 'center' },
    subtitle: { fontSize: 15, color: c.textMuted, textAlign: 'center' },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingVertical: 14,
      fontSize: 28,
      letterSpacing: 8,
      textAlign: 'center',
      color: c.text,
    },
    error: { color: c.danger, fontSize: 14, textAlign: 'center' },
  }),
);
