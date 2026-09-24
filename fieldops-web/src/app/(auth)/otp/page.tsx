'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { OtpForm } from '@/features/auth/components/OtpForm';
import type { MfaChannel } from '@/lib/api/types';

function OtpPageContent() {
  const params = useSearchParams();
  const mfaToken = params.get('mfaToken');
  const channel = params.get('channel') as MfaChannel | null;

  if (!mfaToken || !channel) {
    return <p className="text-sm text-destructive text-center">Session de connexion invalide. Retournez à l&apos;écran de connexion.</p>;
  }

  return <OtpForm mfaToken={mfaToken} channel={channel} />;
}

export default function OtpPage() {
  return (
    <Suspense>
      <OtpPageContent />
    </Suspense>
  );
}
