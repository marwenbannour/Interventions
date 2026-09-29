'use client';

import { LogOut, Mail, Moon, Phone, ShieldCheck, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { authApi } from '@/features/auth/api/auth.api';
import { ROLE_LABEL } from '@/features/auth/components/AppShell';
import { useSessionStore } from '@/features/auth/store/session.store';
import { useConnectionStore } from '@/lib/realtime/connection.store';
import { disconnectSocket } from '@/lib/realtime/socket';

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <Icon className="size-5 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function ProfileView() {
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);
  const connection = useConnectionStore((s) => s.status);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  if (!user) return null;
  const dark = resolvedTheme === 'dark';

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    disconnectSocket();
    clearSession();
    router.replace('/login');
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-xl font-bold text-foreground">Profil</h1>

      <section className="flex items-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Avatar className="size-20">
          <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
            {`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-xl font-bold text-foreground">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{ROLE_LABEL[user.role] ?? user.role}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <span className={`size-2 rounded-full ${connection === 'connected' ? 'bg-success' : 'bg-muted-foreground/40'}`} />
            {connection === 'connected' ? 'En ligne' : 'Hors ligne'}
          </p>
        </div>
      </section>

      <section className="divide-y divide-border rounded-2xl border border-border bg-card px-6 shadow-sm">
        <Row icon={User} label="Nom" value={`${user.firstName} ${user.lastName}`} />
        <Row icon={Mail} label="E-mail" value={user.email} />
        {user.phone ? <Row icon={Phone} label="Téléphone" value={user.phone} /> : null}
        <Row icon={ShieldCheck} label="Rôle" value={ROLE_LABEL[user.role] ?? user.role} />
      </section>

      <section className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        {dark ? <Moon className="size-5 text-muted-foreground" /> : <Sun className="size-5 text-muted-foreground" />}
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Mode sombre</p>
          <p className="text-xs text-muted-foreground">Mémorisé sur ce navigateur.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label="Mode sombre"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          className={`relative h-6 w-11 rounded-full transition-colors ${dark ? 'bg-primary' : 'bg-border'}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </section>

      <Button variant="outline" onClick={logout} className="self-start text-destructive">
        <LogOut className="size-4" />
        Se déconnecter
      </Button>
    </div>
  );
}
