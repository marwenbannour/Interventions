'use client';

import { AlertTriangle, Loader2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { priorityLabel, statusLabel } from '@/features/dispatch/utils/labels';
import { useSessionStore } from '@/features/auth/store/session.store';
import { canManageSla } from '@/lib/auth/permissions';
import { useSlaAtRisk, useSlaPolicies, useUpdateSlaPolicy } from '../hooks/useSla';
import type { SlaPolicy } from '../types';
import { SlaPolicyFormDialog } from './SlaPolicyFormDialog';

function scopeLabel(policy: SlaPolicy): string {
  const parts: string[] = [];
  if (policy.clientId) parts.push('Client spécifique');
  if (policy.siteId) parts.push('Site spécifique');
  if (policy.taskType) parts.push(policy.taskType);
  if (policy.priority) parts.push(priorityLabel(policy.priority));
  return parts.length > 0 ? parts.join(' · ') : 'Toute organisation';
}

function minutesOrDash(v: number | null): string {
  return v ? `${v} min` : '—';
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

function PolicyToggle({ policy }: { policy: SlaPolicy }) {
  const update = useUpdateSlaPolicy(policy.id);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={update.isPending}
      onClick={() => update.mutate({ isActive: !policy.isActive })}
      className="h-7 px-2 text-xs"
    >
      {update.isPending ? <Loader2 className="size-3 animate-spin" /> : policy.isActive ? 'Désactiver' : 'Activer'}
    </Button>
  );
}

function AtRiskSection() {
  const [horizon, setHorizon] = useState(60);
  const { data: tasks, isLoading } = useSlaAtRisk(horizon);

  const metricBadges = (task: NonNullable<typeof tasks>[number]) => {
    const items: { label: string; due: string | null }[] = [];
    if (!task.acceptedAt && task.ackDueAt) items.push({ label: 'Prise en charge', due: task.ackDueAt });
    if (!task.arrivedAt && task.arrivalDueAt) items.push({ label: 'Arrivée', due: task.arrivalDueAt });
    if (!task.completedAt && task.interventionDueAt) items.push({ label: 'Intervention', due: task.interventionDueAt });
    if (!task.completedAt && task.closeDueAt) items.push({ label: 'Clôture', due: task.closeDueAt });
    return items;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Interventions à risque</h2>
          <p className="text-xs text-muted-foreground">Échéance SLA dans la fenêtre sélectionnée, non encore atteinte.</p>
        </div>
        <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">1 heure</SelectItem>
            <SelectItem value="240">4 heures</SelectItem>
            <SelectItem value="1440">24 heures</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="overflow-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Référence</th>
                <th className="px-4 py-2 font-medium">Titre</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2 font-medium">Priorité</th>
                <th className="px-4 py-2 font-medium">Échéances</th>
              </tr>
            </thead>
            <tbody>
              {(tasks ?? []).map((task) => (
                <tr key={task.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium text-foreground">{task.reference}</td>
                  <td className="max-w-56 truncate px-4 py-2 text-foreground">{task.title}</td>
                  <td className="px-4 py-2 text-muted-foreground">{task.site?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {task.agent ? `${task.agent.firstName} ${task.agent.lastName}` : 'Non affectée'}
                  </td>
                  <td className="px-4 py-2 text-foreground">{statusLabel(task.status)}</td>
                  <td className="px-4 py-2">
                    <Badge variant={task.priority === 'URGENT' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {priorityLabel(task.priority)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {metricBadges(task).map((m) => (
                        <span
                          key={m.label}
                          className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive"
                        >
                          <AlertTriangle className="size-3" />
                          {m.label} {formatDateTime(m.due)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {(tasks ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Aucune intervention à risque sur cette fenêtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SlaPoliciesView() {
  const user = useSessionStore((s) => s.user);
  const manage = user ? canManageSla(user.role) : false;
  const { data: policies, isLoading } = useSlaPolicies();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SlaPolicy | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (policy: SlaPolicy) => {
    setEditing(policy);
    setFormOpen(true);
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">SLA</h1>
          <p className="text-sm text-muted-foreground">Politiques de délais et suivi des interventions à risque.</p>
        </div>
        {manage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Nouvelle politique
          </Button>
        )}
      </div>

      {isLoading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="overflow-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Nom</th>
                <th className="px-4 py-2 font-medium">Portée</th>
                <th className="px-4 py-2 font-medium">Prise en charge</th>
                <th className="px-4 py-2 font-medium">Arrivée</th>
                <th className="px-4 py-2 font-medium">Intervention</th>
                <th className="px-4 py-2 font-medium">Clôture</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                {manage && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(policies ?? []).map((policy) => (
                <tr key={policy.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium text-foreground">{policy.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{scopeLabel(policy)}</td>
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{minutesOrDash(policy.acknowledgeMinutes)}</td>
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{minutesOrDash(policy.arrivalMinutes)}</td>
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{minutesOrDash(policy.interventionMinutes)}</td>
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{minutesOrDash(policy.closureMinutes)}</td>
                  <td className="px-4 py-2">
                    <Badge variant={policy.isActive ? 'secondary' : 'outline'} className="text-[10px]">
                      {policy.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  {manage && (
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(policy)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <PolicyToggle policy={policy} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {(policies ?? []).length === 0 && (
                <tr>
                  <td colSpan={manage ? 8 : 7} className="px-4 py-6 text-center text-muted-foreground">
                    Aucune politique SLA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AtRiskSection />

      {manage && <SlaPolicyFormDialog policy={editing} open={formOpen} onOpenChange={setFormOpen} />}
    </div>
  );
}
