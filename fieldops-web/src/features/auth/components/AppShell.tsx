'use client';

import { BarChart3, Bell, Building2, Clock, LayoutGrid, LogOut, MapPin, ShieldCheck, Wrench } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { disconnectSocket } from '@/lib/realtime/socket';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { canReadSla, isAdmin } from '@/lib/auth/permissions';
import { authApi } from '../api/auth.api';
import { useSessionStore } from '../store/session.store';
import { ConnectionIndicator } from './ConnectionIndicator';

const roleLabel: Record<string, string> = {
  ADMIN: 'Administrateur',
  SUPERVISOR: 'Superviseur',
  DIRECTION: 'Direction',
  AGENT: 'Agent',
  CLIENT: 'Client',
};

const navItems = [
  { href: '/dispatch', label: 'Dispatch', icon: LayoutGrid },
  { href: '/agents', label: 'Agents', icon: MapPin },
  { href: '/clients', label: 'Clients', icon: Building2 },
  { href: '/reports', label: 'Reporting', icon: BarChart3 },
  { href: '/quality', label: 'Qualité', icon: ShieldCheck },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useRealtimeConnection();

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    disconnectSocket();
    clearSession();
    router.replace('/login');
  };

  if (status === 'unknown') {
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
  const items = [
    ...navItems,
    ...(canReadSla(user.role) ? [{ href: '/sla', label: 'SLA', icon: Clock }] : []),
    ...(isAdmin(user.role) ? [{ href: '/admin', label: 'Admin', icon: Wrench }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-60 flex-none flex-col border-r border-sidebar-border bg-sidebar px-4 py-6">
        <div className="mb-8 px-2">
          <p className="text-lg font-bold text-sidebar-foreground">FieldOps</p>
          <p className="text-xs text-muted-foreground">Backoffice</p>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-none items-center justify-between border-b border-border bg-card px-6">
          <ConnectionIndicator />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 rounded-full outline-none">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{roleLabel[user.role] ?? user.role}</p>
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
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
