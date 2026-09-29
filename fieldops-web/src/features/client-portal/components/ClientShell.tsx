'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { authApi } from '@/features/auth/api/auth.api';
import { useSessionStore } from '@/features/auth/store/session.store';
import { disconnectSocket } from '@/lib/realtime/socket';

export function ClientShell({ children }: { children: React.ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && user && user.role !== 'CLIENT') {
      router.replace('/dispatch');
    }
  }, [status, user, router]);

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    disconnectSocket();
    clearSession();
    router.replace('/login');
  };

  if (status === 'unknown' || (status === 'authenticated' && user?.role !== 'CLIENT')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return null;
  }

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 flex-none items-center justify-between border-b border-border bg-card px-6">
        <div>
          <p className="text-base font-bold text-foreground">FieldOps</p>
          <p className="text-xs text-muted-foreground">Espace client</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-full outline-none">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground">Client</p>
            </div>
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={logout} variant="destructive">
              <LogOut className="size-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-6">{children}</main>
    </div>
  );
}
