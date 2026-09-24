'use client';

import { ShieldAlert } from 'lucide-react';
import { isAdmin } from '@/lib/auth/permissions';
import { useSessionStore } from '../store/session.store';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const role = useSessionStore((s) => s.user?.role);

  if (!role || !isAdmin(role)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Accès réservé aux administrateurs</p>
        <p className="text-sm text-muted-foreground">Votre rôle ne permet pas d&apos;accéder à cette section.</p>
      </div>
    );
  }

  return <>{children}</>;
}
