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
import { ApiError } from '@/lib/api/errors';
import { useAdminUsers } from '../hooks/useAudit';
import { useCreateTeam, useUpdateTeam, useZonesAdmin } from '../hooks/useOrganizationAdmin';
import type { Team } from '../types';

const NONE = '__none__';

const schema = z.object({
  name: z.string().min(1, 'Nom requis').max(120),
  zoneId: z.string().optional(),
  supervisorId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function TeamFormDialog({
  team,
  open,
  onOpenChange,
}: {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!team;
  const create = useCreateTeam();
  const update = useUpdateTeam(team?.id ?? '');
  const { data: zones } = useZonesAdmin();
  const { data: usersPage } = useAdminUsers();
  const pending = create.isPending || update.isPending;

  const supervisors = (usersPage?.data ?? []).filter((u) => u.role === 'SUPERVISOR');

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        name: team?.name ?? '',
        zoneId: team?.zoneId ?? undefined,
        supervisorId: team?.supervisorId ?? undefined,
      });
    }
  }, [open, team, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit) {
        await update.mutateAsync(values);
        toast.success('Équipe mise à jour.');
      } else {
        await create.mutateAsync(values);
        toast.success('Équipe créée.');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Enregistrement impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'équipe" : 'Nouvelle équipe'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" disabled={pending} {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Zone</Label>
            <Controller
              control={control}
              name="zoneId"
              render={({ field }) => (
                <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v && v !== NONE ? v : undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Aucune</SelectItem>
                    {zones?.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Superviseur</Label>
            <Controller
              control={control}
              name="supervisorId"
              render={({ field }) => (
                <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v && v !== NONE ? v : undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Aucun</SelectItem>
                    {supervisors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
