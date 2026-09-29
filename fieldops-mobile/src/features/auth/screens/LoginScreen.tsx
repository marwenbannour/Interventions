import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Icon } from '../../../components/ui/Icon';
import { Button, Field } from '../../../components/ui/primitives';
import { radius } from '../../../theme/palette';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { secureStorage } from '../../../lib/secureStorage';
import { ApiError } from '../../../lib/api/errors';
import { authApi } from '../api/auth.api';
import { useSessionStore } from '../store/session.store';
import type { AuthStackScreenProps } from '../../../navigation/types';

const schema = z.object({
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type FormValues = z.infer<typeof schema>;

export function LoginScreen({ navigation }: AuthStackScreenProps<'Login'>) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const setSession = useSessionStore((s) => s.setSession);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const response = await authApi.login(values);
      if (response.mfaRequired) {
        navigation.navigate('Otp', { mfaToken: response.mfaToken, channel: response.channel });
        return;
      }
      await secureStorage.setRefreshToken(response.refreshToken);
      setSession(response.accessToken, response.user);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Connexion impossible. Vérifiez le réseau.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { paddingTop: insets.top + 40 }]}>
          <View style={styles.logo}>
            <Icon name="engineering" size={56} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Interventions</Text>
          <Text style={styles.heroSubtitle}>Agent</Text>
          <Text style={styles.heroTagline}>Toujours sur le terrain,{'\n'}plus proche de vos équipes</Text>
        </View>

        <View style={styles.sheet}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Field
                icon="mail-outline"
                placeholder="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isSubmitting}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Field
                icon="lock-outline"
                placeholder="Mot de passe"
                secureTextEntry={!showPassword}
                autoComplete="password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isSubmitting}
                error={errors.password?.message}
                right={
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                }
              />
            )}
          />

          {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

          <Button label="Se connecter" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.submit} />

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Mot de passe oublié',
                "Contactez votre superviseur ou l'administrateur FieldOps pour réinitialiser votre mot de passe.",
              )
            }
            style={styles.forgot}
          >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Icon name="support-agent" size={64} color={colors.border} />
            <Text style={styles.footerText}>Une application pour une gestion{'\n'}efficace des interventions</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.primary },
    scroll: { flexGrow: 1 },
    hero: { alignItems: 'center', paddingBottom: 40, paddingHorizontal: 24 },
    logo: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    heroTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '700' },
    heroSubtitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '600' },
    heroTagline: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
    sheet: {
      flexGrow: 1,
      backgroundColor: c.background,
      borderTopLeftRadius: radius.xl + 8,
      borderTopRightRadius: radius.xl + 8,
      padding: 24,
      paddingTop: 32,
      gap: 14,
    },
    serverError: { color: c.danger, fontSize: 14, textAlign: 'center' },
    submit: { marginTop: 6 },
    forgot: { alignItems: 'center', paddingVertical: 6 },
    forgotText: { color: c.primary, fontSize: 14, fontWeight: '600' },
    footer: { alignItems: 'center', marginTop: 'auto', paddingTop: 24, gap: 8 },
    footerText: { color: c.textMuted, fontSize: 12, textAlign: 'center' },
  }),
);
