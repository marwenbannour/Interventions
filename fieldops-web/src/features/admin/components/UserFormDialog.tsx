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
import { ApiError } from '@/lib/api/errors';
import { PASSWORD_MESSAGE, PASSWORD_RULE } from '../utils/validation';
import { useCreateUser, useUpdateUser } from '../hooks/useUsersAdmin';
import type { AdminUser, MfaChannel, Role, UserStatus } from '../types';

const NONE = '__none__';
const ROLES: Role[] = ['ADMIN', 'SUPERVISOR', 'AGENT', 'CLIENT', 'DIRECTION'];
const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrateur',
  SUPERVISOR: 'Superviseur',
  AGENT: 'Agent',
  CLIENT: 'Client',
  DIRECTION: 'Direction',
};
const STATUS_LABEL: Record<UserStatus, string> = { ACTIVE: 'Actif', INVITED: 'Invité', SUSPENDED: 'Suspendu' };

/** Un seul schéma : email/mot de passe ne sont validés comme requis qu'à la création (superRefine). */
function buildSchema(isEdit: boolean) {
  return z
    .object({
      email: z.string().optional(),
      password: z.string().optional(),
      firstName: z.string().min(1, 'Prénom requis').max(100),
      lastName: z.string().min(1, 'Nom requis').max(100),
      phone: z.string().optional(),
      role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT', 'CLIENT', 'DIRECTION']),
      clientId: z.string().optional(),
      mfaEnabled: z.boolean().optional(),
      mfaChannel: z.enum(['EMAIL', 'SMS']).optional(),
      status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']).optional(),
    })
    .superRefine((v, ctx) => {
      if (v.role === 'CLIENT' && !v.clientId) {
        ctx.addIssue({ code: 'custom', message: 'Client requis', path: ['clientId'] });
      }
      if (!isEdit) {
        if (!v.email || !z.string().email().safeParse(v.email).success) {
          ctx.addIssue({ code: 'custom', message: 'E-mail invalide', path: ['email'] });
        }
        if (!v.password || !PASSWORD_RULE.test(v.password)) {
          ctx.addIssue({ code: 'custom', message: PASSWORD_MESSAGE, path: ['password'] });
        }
      }
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export function UserFormDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!user;
  const create = useCreateUser();
  const update = useUpdateUser(user?.id ?? '');
  const { data: clientsPage } = useClients();
  const clients = clientsPage?.data ?? [];
  const pending = create.isPending || update.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(buildSchema(isEdit)) });

  const role = watch('role');
  const mfaEnabled = watch('mfaEnabled');

  useEffect(() => {
    if (open) {
      reset({
        email: '',
        password: '',
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        phone: user?.phone ?? '',
        role: user?.role ?? 'AGENT',
        clientId: user?.clientId ?? undefined,
        mfaEnabled: user?.mfaEnabled ?? false,
        mfaChannel: user?.mfaChannel ?? 'EMAIL',
        status: user?.status ?? 'ACTIVE',
      });
    }
  }, [open, user, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit) {
        await update.mutateAsync({
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          role: values.role,
          clientId: values.clientId,
          mfaEnabled: values.mfaEnabled,
          mfaChannel: values.mfaChannel,
          status: values.status,
        });
        toast.success('Compte mis à jour.');
      } else {
        // superRefine garantit email/password renseignés et valides quand !isEdit.
        await create.mutateAsync({ ...values, email: values.email as string, password: values.password as string });
        toast.success('Compte créé.');
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
          <DialogTitle>{isEdit ? 'Modifier le compte' : 'Nouveau compte'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" disabled={pending} {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" disabled={pending} {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" disabled={pending} {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" disabled={pending} {...register('password')} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" disabled={pending} {...register('phone')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rôle</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {role === 'CLIENT' && (
            <div className="flex flex-col gap-1.5">
              <Label>Client rattaché</Label>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v && v !== NONE ? v : undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
            </div>
          )}

          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label>Statut</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as UserStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input id="mfaEnabled" type="checkbox" className="size-3.5" {...register('mfaEnabled')} />
            <Label htmlFor="mfaEnabled" className="text-sm font-normal">
              Authentification à deux facteurs activée
            </Label>
          </div>

          {mfaEnabled && (
            <div className="flex flex-col gap-1.5">
              <Label>Canal MFA</Label>
              <Controller
                control={control}
                name="mfaChannel"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v as MfaChannel)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">E-mail</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

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
