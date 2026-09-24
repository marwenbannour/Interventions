import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import { colors } from '../../../theme/colors';
import { ApiError } from '../../../lib/api/errors';
import { authApi } from '../../auth/api/auth.api';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z.string().min(8, 'Au moins 8 caractères'),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordCard() {
  const [expanded, setExpanded] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const close = () => {
    setExpanded(false);
    setServerError(null);
    reset();
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await authApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      close();
      Alert.alert('Mot de passe modifié', 'Votre mot de passe a été mis à jour.');
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Changement de mot de passe impossible.');
    }
  };

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.toggleButton} onPress={() => setExpanded(true)}>
        <Text style={styles.toggleButtonText}>Changer le mot de passe</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Changer le mot de passe</Text>

      <Controller
        control={control}
        name="currentPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Mot de passe actuel"
            secureTextEntry
            autoComplete="password"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            editable={!isSubmitting}
          />
        )}
      />
      {errors.currentPassword && <Text style={styles.fieldError}>{errors.currentPassword.message}</Text>}

      <Controller
        control={control}
        name="newPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Nouveau mot de passe"
            secureTextEntry
            autoComplete="password-new"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            editable={!isSubmitting}
          />
        )}
      />
      {errors.newPassword && <Text style={styles.fieldError}>{errors.newPassword.message}</Text>}

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Confirmer le nouveau mot de passe"
            secureTextEntry
            autoComplete="password-new"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            editable={!isSubmitting}
          />
        )}
      />
      {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>}

      {serverError && <Text style={styles.serverError}>{serverError}</Text>}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={close} disabled={isSubmitting}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.submitButtonText}>Valider</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  toggleButtonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: -6 },
  serverError: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  submitButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: colors.primaryText, fontSize: 15, fontWeight: '600' },
});
