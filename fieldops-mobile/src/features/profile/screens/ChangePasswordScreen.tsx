import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { z } from 'zod';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Button, Field } from '../../../components/ui/primitives';
import { makeStyles } from '../../../theme/ThemeProvider';
import { ApiError } from '../../../lib/api/errors';
import { authApi } from '../../auth/api/auth.api';
import type { ProfileStackScreenProps } from '../../../navigation/types';

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

export function ChangePasswordScreen({ navigation }: ProfileStackScreenProps<'ChangePassword'>) {
  const styles = useStyles();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await authApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      Alert.alert('Mot de passe modifié', 'Votre mot de passe a été mis à jour.');
      navigation.goBack();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Changement de mot de passe impossible.');
    }
  };

  const fields: { name: keyof FormValues; placeholder: string; autoComplete: 'password' | 'password-new' }[] = [
    { name: 'currentPassword', placeholder: 'Mot de passe actuel', autoComplete: 'password' },
    { name: 'newPassword', placeholder: 'Nouveau mot de passe', autoComplete: 'password-new' },
    { name: 'confirmPassword', placeholder: 'Confirmer le nouveau mot de passe', autoComplete: 'password-new' },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Mot de passe" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {fields.map((f) => (
          <Controller
            key={f.name}
            control={control}
            name={f.name}
            render={({ field: { onChange, onBlur, value } }) => (
              <Field
                icon="lock-outline"
                placeholder={f.placeholder}
                secureTextEntry
                autoComplete={f.autoComplete}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isSubmitting}
                error={errors[f.name]?.message}
              />
            )}
          />
        ))}
        {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}
        <Button label="Enregistrer" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 14 },
    serverError: { color: c.danger, fontSize: 13, textAlign: 'center' },
  }),
);
