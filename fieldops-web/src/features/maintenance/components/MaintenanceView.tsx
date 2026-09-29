'use client';

import { CalendarClock, Loader2, Pencil, Play, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/features/auth/store/session.store';
import { ApiError } from '@/lib/api/errors';
import { canManageMaintenance } from '@/lib/auth/permissions';
import { useGeneratePlan, useMaintenancePlans, usePlanPreview, useUpdatePlan } from '../hooks/useMaintenance';
import type { MaintenancePlan } from '../types';
import { fmtDate, recurrenceLabel } from './labels';
import { MaintenancePlanFormDialog } from './MaintenancePlanFormDialog';

function PlanActions({ plan, onEdit }: { plan: MaintenancePlan; onEdit: () => void }) {
  const generate = useGeneratePlan(plan.id);
  const update = useUpdatePlan(plan.id);
  const run = async () => {
    try {
      const r = await generate.mutateAsync();
      if (r.status === 'CREATED') toast.success(`Intervention ${r.reference} créée (échéance ${fmtDate(r.dueAt)}).`);
      else if (r.status === 'ALREADY_EXISTS') toast.info('Cette échéance a déjà été générée.');
      else toast.error(r.error ?? 'Génération impossible.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Génération impossible.');
    }
  };
  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={run} disabled={generate.isPending || !plan.nextDueAt}>
        {generate.isPending ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
        Générer
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        disabled={update.isPending}
        onClick={() => update.mutate({ isActive: !plan.isActive })}
      >
        {plan.isActive ? 'Suspendre' : 'Réactiver'}
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit}>
        <Pencil className="size-3.5" />
      </Button>
    </div>
  );
}

function Preview({ planId }: { planId: string }) {
  const { data } = usePlanPreview(planId);
  if (!data) return <Loader2 className="size-3 animate-spin text-muted-foreground" />;
  return (
    <div className="flex flex-wrap gap-1">
      {data.occurrences.map((o) => (
        <span key={o} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {fmtDate(o)}
        </span>
      ))}
    </div>
  );
}

export function MaintenanceView() {
  const role = useSessionStore((s) => s.user?.role);
  const manage = role ? canManageMaintenance(role) : false;
  const { data, isLoading } = useMaintenancePlans();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenancePlan | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const plans = data?.data ?? [];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Maintenance préventive</h1>
          <p className="text-sm text-muted-foreground">
            Plans récurrents : les interventions sont créées automatiquement avant chaque échéance.
          </p>
        </div>
        {manage && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Nouveau plan
          </Button>
        )}
      </div>

      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Site / équipement</th>
              <th className="px-4 py-2 font-medium">Récurrence</th>
              <th className="px-4 py-2 font-medium">Prochaine échéance</th>
              <th className="px-4 py-2 font-medium">Générées</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              {manage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            )}
            {plans.map((p) => (
              <tr key={p.id} className="border-b border-border align-top last:border-0">
                <td className="px-4 py-2">
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.title} · {p.checklist.length} point(s) de contrôle
                  </p>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {p.site?.name ?? '—'}
                  {p.asset && <span className="block font-mono text-xs">{p.asset.code} — {p.asset.name}</span>}
                </td>
                <td className="px-4 py-2 text-foreground">
                  {recurrenceLabel(p.frequency, p.interval)}
                  <span className="block text-xs text-muted-foreground">préparation J-{p.leadTimeDays}</span>
                </td>
                <td className="px-4 py-2">
                  <button
                    className="flex items-center gap-1 text-foreground hover:underline"
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  >
                    <CalendarClock className="size-3.5" />
                    {p.nextDueAt ? fmtDate(p.nextDueAt) : 'Terminé'}
                  </button>
                  {expanded === p.id && (
                    <div className="mt-1">
                      <Preview planId={p.id} />
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-foreground">
                  {p.generatedCount}
                  {p.lastGeneratedAt && (
                    <span className="block text-xs text-muted-foreground">dernière le {fmtDate(p.lastGeneratedAt)}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={p.isActive ? 'secondary' : 'outline'} className="text-[10px]">
                    {p.isActive ? 'Actif' : 'Suspendu'}
                  </Badge>
                </td>
                {manage && (
                  <td className="px-4 py-2">
                    <PlanActions
                      plan={p}
                      onEdit={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                    />
                  </td>
                )}
              </tr>
            ))}
            {!isLoading && plans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Aucun plan de maintenance.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <MaintenancePlanFormDialog plan={editing} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
