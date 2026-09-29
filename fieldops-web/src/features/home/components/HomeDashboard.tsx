'use client';

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Loader2,
  MapPin,
  Play,
  Plus,
  Siren,
  TrendingUp,
  Zap,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { useSessionStore } from '@/features/auth/store/session.store';
import { canCreateTasks } from '@/lib/auth/permissions';
import { PERIODS, useHomeData, type Period } from '../hooks/useHomeData';
import { KpiCard } from './KpiCard';
import { Panel } from './Panel';
import { RecentActivity } from './RecentActivity';
import { TrendChart } from './TrendChart';
import { UrgentTable } from './UrgentTable';

// Leaflet a besoin de `window` : rendu client uniquement.
const NearbyMap = dynamic(() => import('./NearbyMap').then((m) => m.NearbyMap), {
  ssr: false,
  loading: () => <div className="min-h-64 flex-1 animate-pulse rounded-xl bg-muted" />,
});

function QuickAction({ href, icon: Icon, label, primary }: { href: string; icon: typeof Plus; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors ${
        primary ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-border text-primary hover:bg-accent'
      }`}
    >
      <Icon className="size-5" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4" />
    </Link>
  );
}

const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function HomeDashboard() {
  const user = useSessionStore((s) => s.user);
  const role = user?.role;
  const [period, setPeriod] = useState<Period>('7d');
  const { tasks, counts, delta, urgent, trend, recent, isLoading, isError, truncated } = useHomeData(period);
  const deltaLabel = PERIODS[period].delta;
  const dateLabel = today.format(new Date());

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  if (isError) {
    return <p className="py-12 text-center text-sm text-destructive">Impossible de charger le tableau de bord.</p>;
  }

  const legend = [
    { label: 'Total', value: counts.total, color: 'bg-primary' },
    { label: 'Nouvelles', value: counts.new, color: 'bg-warning' },
    { label: 'En cours', value: counts.active, color: 'bg-indigo' },
    { label: 'Terminées', value: counts.done, color: 'bg-success' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
          <p className="text-sm text-muted-foreground">Voici un aperçu de vos interventions</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <CalendarDays className="size-4" />
            <span className="first-letter:uppercase">{dateLabel}</span>
          </span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            aria-label="Période des variations"
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground outline-none focus:border-primary"
          >
            {(Object.keys(PERIODS) as Period[]).map((p) => (
              <option key={p} value={p}>
                {PERIODS[p].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Total interventions" value={counts.total} delta={delta.total} deltaLabel={deltaLabel} icon={CalendarDays} iconClass="bg-primary text-white" href="/dispatch?view=table" />
        <KpiCard label="Nouvelles" value={counts.new} delta={delta.new} deltaLabel={deltaLabel} icon={Clock3} iconClass="bg-warning text-white" href="/dispatch?view=table" />
        <KpiCard label="En cours" value={counts.active} delta={delta.active} deltaLabel={deltaLabel} icon={Play} iconClass="bg-success text-white" href="/dispatch?view=table" />
        <KpiCard label="Terminées" value={counts.done} delta={delta.done} deltaLabel={deltaLabel} icon={CheckCircle2} iconClass="bg-indigo text-white" href="/dispatch?view=table" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
        <Panel
          title="Interventions urgentes"
          icon={Siren}
          iconClass="text-destructive"
          action={{ label: 'Voir tout', href: '/dispatch?view=table' }}
          className="md:col-span-2 xl:col-span-5 xl:row-span-2"
        >
          <UrgentTable tasks={urgent.slice(0, 8)} />
        </Panel>

        <Panel
          title="Évolution des interventions"
          icon={TrendingUp}
          action={<span className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">7 jours</span>}
          className="xl:col-span-4"
        >
          <p className="-mt-2 mb-2 text-xs text-muted-foreground">Interventions créées par jour</p>
          <TrendChart points={trend} />
          <div className="mt-3 grid grid-cols-4 divide-x divide-border border-t border-border pt-3">
            {legend.map((l) => (
              <div key={l.label} className="px-2 first:pl-0">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`size-2 flex-none rounded-full ${l.color}`} />
                  {l.label}
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground">{l.value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Interventions à proximité" icon={MapPin} action={{ label: 'Voir toutes', href: '/dispatch?view=table' }} className="xl:col-span-3">
          <NearbyMap tasks={tasks} />
        </Panel>

        <Panel title="Activité récente" icon={Activity} action={{ label: 'Voir tout', href: '/dispatch?view=table' }} className="xl:col-span-4">
          <RecentActivity tasks={recent} />
        </Panel>

        <Panel title="Actions rapides" icon={Zap} className="xl:col-span-3">
          <div className="flex flex-col gap-3">
            {role && canCreateTasks(role) ? <QuickAction href="/dispatch?new=1" icon={Plus} label="Nouvelle intervention" primary /> : null}
            <QuickAction href="/agents" icon={MapPin} label="Voir la carte" />
            <QuickAction href="/dispatch?view=table" icon={Filter} label="Filtrer" />
          </div>
        </Panel>
      </div>

      {truncated ? (
        <p className="text-xs text-muted-foreground">Indicateurs calculés sur les 200 interventions les plus récentes des 30 derniers jours.</p>
      ) : null}
    </div>
  );
}
