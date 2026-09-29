'use client';

import {
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock,
  Cog,
  HardHat,
  Home,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { useConnectionStore } from '@/lib/realtime/connection.store';
import { disconnectSocket } from '@/lib/realtime/socket';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { canReadAssets, canReadMaintenance, canReadSla, isAdmin } from '@/lib/auth/permissions';
import type { Role } from '@/lib/api/types';
import { authApi } from '../api/auth.api';
import { useSessionStore } from '../store/session.store';

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrateur',
  SUPERVISOR: 'Superviseur',
  DIRECTION: 'Direction',
  AGENT: "Agent d'intervention",
  CLIENT: 'Client',
};

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: number;
}

const COLLAPSED_KEY = 'fieldops.sidebarCollapsed';

function navItems(role: Role, unread: number): NavItem[] {
  return [
    { href: '/accueil', label: 'Accueil', icon: Home },
    { href: '/dispatch', label: 'Interventions', icon: ClipboardList },
    { href: '/agents', label: 'Carte', icon: MapPin },
    { href: '/clients', label: 'Clients', icon: Building2 },
    ...(canReadAssets(role) ? [{ href: '/assets', label: 'Équipements', icon: Cog }] : []),
    ...(canReadMaintenance(role) ? [{ href: '/maintenance', label: 'Maintenance', icon: CalendarClock }] : []),
    { href: '/reports', label: 'Reporting', icon: BarChart3 },
    { href: '/quality', label: 'Qualité', icon: ShieldCheck },
    { href: '/notifications', label: 'Notifications', icon: Bell, badge: unread },
    ...(canReadSla(role) ? [{ href: '/sla', label: 'SLA', icon: Clock }] : []),
    { href: '/profil', label: 'Profil', icon: User },
    ...(isAdmin(role) ? [{ href: '/admin', label: 'Paramètres', icon: Settings }] : []),
  ];
}

function Badge({ value, floating }: { value: number; floating?: boolean }) {
  return (
    <span
      className={`flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-5 text-white ${
        floating ? 'absolute -right-2 -top-1.5' : ''
      }`}
    >
      {value > 9 ? '9+' : value}
    </span>
  );
}

function SidebarContent({
  items,
  pathname,
  collapsed,
  initials,
  name,
  role,
  online,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  initials: string;
  name: string;
  role: string;
  online: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col px-3 py-6">
      <Link href="/accueil" onClick={onNavigate} className="mb-8 flex flex-col items-center gap-1 px-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HardHat className="size-7" strokeWidth={2} />
        </span>
        {!collapsed ? (
          <>
            <span className="text-xl font-bold tracking-tight text-primary">Interventions</span>
            <span className="text-xs text-muted-foreground">{role}</span>
          </>
        ) : null}
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="size-[18px] flex-none" />
              {!collapsed ? <span className="flex-1">{item.label}</span> : null}
              {item.badge ? <Badge value={item.badge} floating={collapsed} /> : null}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/profil"
        onClick={onNavigate}
        className={`mt-auto flex items-center gap-3 rounded-2xl border border-sidebar-border p-3 hover:bg-sidebar-accent ${collapsed ? 'justify-center' : ''}`}
      >
        <Avatar className="size-10">
          <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
        {!collapsed ? (
          <div className="min-w-0" data-testid="sidebar-user">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{role}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`size-2 rounded-full ${online ? 'bg-success' : 'bg-muted-foreground/40'}`} />
              {online ? 'En ligne' : 'Hors ligne'}
            </p>
          </div>
        ) : null}
      </Link>
    </div>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Basculer le mode sombre"
      className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {/* Les deux icônes sont rendues ; la classe `dark` choisit : pas d'écart d'hydratation. */}
      <Moon className="size-5 dark:hidden" />
      <Sun className="hidden size-5 dark:block" />
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);
  const connection = useConnectionStore((s) => s.status);
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  // Seulement une fois la session restaurée : sinon la requête part sans jeton et son 401
  // déclencherait un second refresh concurrent du silent refresh.
  const { data: notifications } = useNotifications({ limit: 1 }, status === 'authenticated');

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

  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setCollapsed((c) => {
        try {
          window.localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
        } catch {
          // Préférence non mémorisée (navigation privée) : sans incidence.
        }
        return !c;
      });
    } else {
      setMobileOpen(true);
    }
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

  const unread = notifications?.unread ?? 0;
  const items = navItems(user.role, unread);
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const sidebarProps = {
    items,
    pathname,
    initials,
    name: `${user.firstName} ${user.lastName}`,
    role: roleLabel,
    online: connection === 'connected',
  };
  const bottomItems = items.filter((i) => ['/accueil', '/dispatch', '/agents', '/notifications', '/profil'].includes(i.href));

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/dispatch?view=table&search=${encodeURIComponent(q)}` : '/dispatch?view=table');
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`sticky top-0 hidden h-screen flex-none overflow-y-auto border-r border-sidebar-border bg-sidebar transition-[width] lg:block ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent {...sidebarProps} collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarContent {...sidebarProps} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 flex-none items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:gap-5 lg:px-8">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Menu"
            className="flex size-9 flex-none items-center justify-center rounded-lg text-foreground hover:bg-accent"
          >
            <Menu className="size-5" />
          </button>

          {/* Mobile : la recherche se réduit à une icône qui ouvre la liste filtrable (maquette). */}
          <Link
            href="/dispatch?view=table"
            aria-label="Rechercher"
            className="ml-auto flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-accent sm:hidden"
          >
            <Search className="size-5" />
          </Link>
          <form onSubmit={submitSearch} className="relative hidden min-w-0 flex-1 sm:block lg:max-w-xl">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une intervention, un client, un lieu…"
              aria-label="Recherche globale"
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15"
            />
          </form>

          <div className="flex flex-none items-center gap-1 sm:ml-auto sm:gap-2">
            <NotificationBell />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full outline-none" aria-label="Mon compte">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/profil')}>
                  <User className="size-4" />
                  Profil
                </DropdownMenuItem>
                {isAdmin(user.role) ? (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <Settings className="size-4" />
                    Paramètres
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} variant="destructive">
                  <LogOut className="size-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>
      </div>

      {/* Mobile / tablette : barre d'onglets (maquette). */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {bottomItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="relative">
                <Icon className="size-5" />
                {item.badge ? <Badge value={item.badge} floating /> : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
