'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/errors';
import { authApi } from '../api/auth.api';
import { useSessionStore } from '../store/session.store';
import type { MfaChannel } from '@/lib/api/types';

const schema = z.object({
  code: z.string().length(6, 'Le code doit comporter 6 chiffres'),
});

type FormValues = z.infer<typeof schema>;

const channelLabel: Record<MfaChannel, string> = {
  EMAIL: 'par e-mail',
  SMS: 'par SMS',
};

export function OtpForm({ mfaToken, channel }: { mfaToken: string; channel: MfaChannel }) {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const result = await authApi.verifyOtp(mfaToken, values.code);
      setSession(result.accessToken, result.user);
      router.push('/dispatch');
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Vérification impossible. Vérifiez le réseau.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground text-center">
        Un code de vérification vous a été envoyé {channelLabel[channel]}.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Code de vérification</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={isSubmitting}
          {...register('code')}
        />
        {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive text-center">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? 'Vérification…' : 'Valider'}
      </Button>
    </form>
  );
}
