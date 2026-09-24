'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/features/clients/hooks/useClients';
import { useSites } from '@/features/clients/hooks/useSites';
import type { TaskPriority } from '@/features/dispatch/types';
import { priorityLabel } from '@/features/dispatch/utils/labels';
import { ApiError } from '@/lib/api/errors';
import { useCreateSlaPolicy, useUpdateSlaPolicy } from '../hooks/useSla';
import type { SlaPolicy } from '../types';

const NONE = '__none__';
const PRIORITIES: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

const schema = z.object({
  name: z.string().min(1, 'Nom requis').max(120),
  clientId: z.string().optional(),
  siteId: z.string().optional(),
  taskType: z.string().optional(),
  priority: z.string().optional(),
  acknowledgeMinutes: z.string().optional(),
  arrivalMinutes: z.string().optional(),
  interventionMinutes: z.string().optional(),
  closureMinutes: z.string().optional(),
  warningMinutesBefore: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toIntOrUndefined(v: string | undefined): number | undefined {
  if (!v || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function SlaPolicyFormDialog({
  policy,
  open,
  onOpenChange,
}: {
  policy: SlaPolicy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!policy;
  const create = useCreateSlaPolicy();
  const update = useUpdateSlaPolicy(policy?.id ?? '');
  const pending = create.isPending || update.isPending;

  const { data: clientsPage } = useClients();
  const clients = clientsPage?.data ?? [];

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const clientId = watch('clientId');
  const { data: sitesPage } = useSites(clientId && clientId !== NONE ? clientId : null);
  const sites = sitesPage?.data ?? [];

  useEffect(() => {
    if (open) {
      reset({
        name: policy?.name ?? '',
        clientId: policy?.clientId ?? undefined,
        siteId: policy?.siteId ?? undefined,
        taskType: policy?.taskType ?? '',
        priority: policy?.priority ?? undefined,
        acknowledgeMinutes: policy?.acknowledgeMinutes ? String(policy.acknowledgeMinutes) : '',
        arrivalMinutes: policy?.arrivalMinutes ? String(policy.arrivalMinutes) : '',
        interventionMinutes: policy?.interventionMinutes ? String(policy.interventionMinutes) : '',
        closureMinutes: policy?.closureMinutes ? String(policy.closureMinutes) : '',
        warningMinutesBefore: policy ? String(policy.warningMinutesBefore) : '15',
      });
    }
  }, [open, policy, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      clientId: values.clientId && values.clientId !== NONE ? values.clientId : undefined,
      siteId: values.siteId && values.siteId !== NONE ? values.siteId : undefined,
      taskType: values.taskType?.trim() || undefined,
      priority: values.priority && values.priority !== NONE ? (values.priority as TaskPriority) : undefined,
      acknowledgeMinutes: toIntOrUndefined(values.acknowledgeMinutes),
      arrivalMinutes: toIntOrUndefined(values.arrivalMinutes),
      interventionMinutes: toIntOrUndefined(values.interventionMinutes),
      closureMinutes: toIntOrUndefined(values.closureMinutes),
      warningMinutesBefore: toIntOrUndefined(values.warningMinutesBefore),
    };
    try {
      if (isEdit) {
        await update.mutateAsync(payload);
        toast.success('Politique SLA mise à jour.');
      } else {
        await create.mutateAsync(payload);
        toast.success('Politique SLA créée.');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Enregistrement impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la politique SLA' : 'Nouvelle politique SLA'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" disabled={pending} {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <p className="text-xs text-muted-foreground">
            Portée (optionnelle) — la politique la plus spécifique correspondant à la tâche s&apos;applique.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Client</Label>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => {
                      field.onChange(v && v !== NONE ? v : undefined);
                      setValue('siteId', undefined);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Tous les clients</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Site</Label>
              <Controller
                control={control}
                name="siteId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v && v !== NONE ? v : undefined)}
                    disabled={!clientId || clientId === NONE}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Tous les sites</SelectItem>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taskType">Type d&apos;intervention</Label>
              <Input id="taskType" placeholder="ex. CLEANING" disabled={pending} {...register('taskType')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priorité</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v && v !== NONE ? v : undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Toutes</SelectItem>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {priorityLabel(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Délais (minutes) — laisser vide pour ne pas contraindre cette étape.</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acknowledgeMinutes">Prise en charge</Label>
              <Input id="acknowledgeMinutes" type="number" min={1} disabled={pending} {...register('acknowledgeMinutes')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="arrivalMinutes">Arrivée sur site</Label>
              <Input id="arrivalMinutes" type="number" min={1} disabled={pending} {...register('arrivalMinutes')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interventionMinutes">Durée d&apos;intervention</Label>
              <Input id="interventionMinutes" type="number" min={1} disabled={pending} {...register('interventionMinutes')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="closureMinutes">Clôture</Label>
              <Input id="closureMinutes" type="number" min={1} disabled={pending} {...register('closureMinutes')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warningMinutesBefore">Alerte préventive (minutes avant échéance)</Label>
            <Input
              id="warningMinutesBefore"
              type="number"
              min={0}
              max={1440}
              className="w-40"
              disabled={pending}
              {...register('warningMinutesBefore')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
