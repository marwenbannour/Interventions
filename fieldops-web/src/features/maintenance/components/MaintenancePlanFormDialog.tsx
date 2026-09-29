'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScopePicker, type Scope } from '@/features/assets/components/ScopePicker';
import type { TaskPriority } from '@/features/dispatch/types';
import { priorityLabel } from '@/features/dispatch/utils/labels';
import { ApiError } from '@/lib/api/errors';
import { useCreatePlan, useUpdatePlan } from '../hooks/useMaintenance';
import type { MaintenanceFrequency, MaintenancePlan } from '../types';
import { FREQUENCY_LABEL, recurrenceLabel } from './labels';

const PRIORITIES: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
function initialForm(plan: MaintenancePlan | null): FormState {
  const tomorrow = new Date(Date.now() + 86_400_000);
  tomorrow.setHours(8, 0, 0, 0);
  return {
    name: plan?.name ?? '',
    title: plan?.title ?? '',
    taskType: plan?.taskType ?? 'MAINTENANCE',
    description: plan?.description ?? '',
    priority: plan?.priority ?? 'NORMAL',
    skills: plan?.requiredSkills.join(', ') ?? '',
    checklist: plan?.checklist.map((c) => c.label).join('\n') ?? '',
    duration: plan?.estimatedDurationMin ? String(plan.estimatedDurationMin) : '60',
    frequency: plan?.frequency ?? 'MONTHLY',
    interval: String(plan?.interval ?? 1),
    startAt: toLocalInput(plan?.startAt ?? tomorrow.toISOString()),
    endAt: plan?.endAt ? toLocalInput(plan.endAt) : '',
    leadTimeDays: String(plan?.leadTimeDays ?? 7),
  };
}

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

interface FormState {
  name: string;
  title: string;
  taskType: string;
  description: string;
  priority: TaskPriority;
  skills: string;
  checklist: string;
  duration: string;
  frequency: MaintenanceFrequency;
  interval: string;
  startAt: string;
  endAt: string;
  leadTimeDays: string;
}

function MaintenancePlanFormDialogInner({
  plan,
  open,
  onOpenChange,
}: {
  plan: MaintenancePlan | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const isEdit = !!plan;
  const create = useCreatePlan();
  const update = useUpdatePlan(plan?.id ?? '');
  const pending = create.isPending || update.isPending;
  const [scope, setScope] = useState<Scope>(() =>
    plan ? { clientId: plan.clientId, siteId: plan.siteId, assetId: plan.assetId ?? undefined } : {},
  );
  const [f, setF] = useState<FormState | null>(() => initialForm(plan));
  const [error, setError] = useState<string | null>(null);


  if (!f) return null;
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => (p ? { ...p, [k]: e.target.value } : p));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const interval = Number(f.interval);
    const lead = Number(f.leadTimeDays);
    if (!f.name.trim() || !f.title.trim()) return setError('Nom du plan et titre de l’intervention requis.');
    if (!isEdit && !scope.siteId) return setError('Site requis.');
    if (!Number.isInteger(interval) || interval < 1 || interval > 365) return setError('Intervalle entre 1 et 365.');
    if (!Number.isInteger(lead) || lead < 0 || lead > 90) return setError('Préparation entre 0 et 90 jours.');
    setError(null);
    const payload = {
      name: f.name.trim(),
      title: f.title.trim(),
      taskType: f.taskType.trim() || 'MAINTENANCE',
      description: f.description.trim() || undefined,
      priority: f.priority,
      requiredSkills: f.skills.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
      checklist: lines(f.checklist).map((label) => ({ label, required: true })),
      estimatedDurationMin: Number(f.duration) > 0 ? Number(f.duration) : undefined,
      frequency: f.frequency,
      interval,
      startAt: new Date(f.startAt).toISOString(),
      endAt: f.endAt ? new Date(f.endAt).toISOString() : undefined,
      leadTimeDays: lead,
      assetId: scope.assetId,
    };
    try {
      if (isEdit) await update.mutateAsync(payload);
      else await create.mutateAsync({ ...payload, siteId: scope.siteId! });
      toast.success(isEdit ? 'Plan mis à jour.' : 'Plan de maintenance créé.');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le plan' : 'Nouveau plan de maintenance préventive'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex max-h-[72vh] flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-name">Nom du plan *</Label>
            <Input id="m-name" value={f.name} onChange={set('name')} disabled={pending} placeholder="CTA toiture — entretien trimestriel" />
          </div>
          <ScopePicker value={scope} onChange={setScope} lockSite={isEdit} disabled={pending} />

          <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Récurrence</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Fréquence</Label>
              <Select value={f.frequency} onValueChange={(v) => v && setF({ ...f, frequency: v as MaintenanceFrequency })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{FREQUENCY_LABEL[f.frequency]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABEL) as MaintenanceFrequency[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {FREQUENCY_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-int">Intervalle</Label>
              <Input id="m-int" type="number" min={1} max={365} value={f.interval} onChange={set('interval')} disabled={pending} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="m-start">Première échéance *</Label>
              <Input id="m-start" type="datetime-local" value={f.startAt} onChange={set('startAt')} disabled={pending} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="m-end">Fin (optionnelle)</Label>
              <Input id="m-end" type="datetime-local" value={f.endAt} onChange={set('endAt')} disabled={pending} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="m-lead">Créer l&apos;intervention (jours avant)</Label>
              <Input id="m-lead" type="number" min={0} max={90} value={f.leadTimeDays} onChange={set('leadTimeDays')} disabled={pending} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {recurrenceLabel(f.frequency, Number(f.interval) || 1)} — intervention créée {f.leadTimeDays || 0} jour(s) avant chaque échéance.
          </p>

          <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intervention générée</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="m-title">Titre *</Label>
              <Input id="m-title" value={f.title} onChange={set('title')} disabled={pending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-type">Type</Label>
              <Input id="m-type" value={f.taskType} onChange={set('taskType')} disabled={pending} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Priorité</Label>
              <Select value={f.priority} onValueChange={(v) => v && setF({ ...f, priority: v as TaskPriority })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{priorityLabel(f.priority)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-dur">Durée estimée (min)</Label>
              <Input id="m-dur" type="number" min={1} value={f.duration} onChange={set('duration')} disabled={pending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-skills">Compétences</Label>
              <Input id="m-skills" value={f.skills} onChange={set('skills')} disabled={pending} placeholder="CVC, ELECTRICITE" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-check">Checklist (un point par ligne)</Label>
            <Textarea id="m-check" rows={4} value={f.checklist} onChange={set('checklist')} disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-desc">Consignes</Label>
            <Textarea id="m-desc" rows={2} value={f.description} onChange={set('description')} disabled={pending} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer le plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Le formulaire n'est monté qu'à l'ouverture et réinitialisé via `key` : l'état local
 * s'initialise par lazy initializer, sans setState dans un effet (règle React Compiler du projet).
 */
export function MaintenancePlanFormDialog(props: Parameters<typeof MaintenancePlanFormDialogInner>[0]) {
  if (!props.open) return null;
  return <MaintenancePlanFormDialogInner key={props.plan?.id ?? 'new'} {...props} />;
}
